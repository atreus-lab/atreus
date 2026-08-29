#![no_std]
#![allow(deprecated)]
#![allow(clippy::too_many_arguments)]
use soroban_sdk::{
    contract, contractclient, contractimpl, contracttype, symbol_short, token, vec, Address, Bytes,
    BytesN, Env, IntoVal, Symbol, Val, Vec,
};

const STORAGE_TTL_THRESHOLD: u32 = 535_679;
const STORAGE_TTL_EXTEND_TO: u32 = 535_679;

const CLAIM_DOMAIN: &[u8; 15] = b"ATREUS_CLAIM_V1";
const EMAIL_DOMAIN: &[u8; 15] = b"ATREUS_EMAIL_V1";

/// A Stellar strkey is always 56 ASCII characters.
const STRKEY_LEN: usize = 56;

/// Bound on recipients per split link: keeps the O(n) scans in `claim_split`
/// and the per-link storage entry small and gas-predictable.
const MAX_SPLIT_RECIPIENTS: u32 = 50;

/// Basis-point denominator used for `min_claim_bps`.
const BPS_DENOMINATOR: i128 = 10_000;

fn recipient_strkey(recipient: &Address) -> [u8; STRKEY_LEN] {
    let s = recipient.to_string();
    if s.len() as usize != STRKEY_LEN {
        panic!("invalid recipient");
    }
    let mut out = [0u8; STRKEY_LEN];
    s.copy_into_slice(&mut out);
    out
}

/// sha256(domain || link_hash || recipient_strkey || tail || salt). The attester
/// computes the same value off-chain, so no argument or event ever joins
/// `link_hash` to `recipient` on-chain.
fn blinded_key(
    env: &Env,
    domain: &[u8],
    link_hash: &BytesN<32>,
    strkey: &[u8; STRKEY_LEN],
    tail: Option<&[u8; 32]>,
    salt: &BytesN<32>,
) -> BytesN<32> {
    let mut preimage = Bytes::new(env);
    preimage.extend_from_slice(domain);
    preimage.extend_from_array(&link_hash.to_array());
    preimage.extend_from_array(strkey);
    if let Some(tail) = tail {
        preimage.extend_from_array(tail);
    }
    preimage.extend_from_array(&salt.to_array());
    BytesN::from_array(env, &env.crypto().sha256(&preimage).to_array())
}

/// Shared by `claim_link` and `claim_split`: when `policy_type == 1`
/// (email-restricted), recomputes the blinded `email_key` and requires the
/// verifier to have an attestation for it. No-op for any other policy type.
fn check_email_policy(
    env: &Env,
    verifier: &Address,
    policy_type: u32,
    policy_params: &Bytes,
    link_hash: &BytesN<32>,
    strkey: &[u8; STRKEY_LEN],
    claim_salt: &BytesN<32>,
) {
    if policy_type != 1 {
        return;
    }
    if policy_params.len() != 32 {
        panic!("invalid policy params length");
    }
    let mut policy_arr = [0u8; 32];
    policy_params.copy_into_slice(&mut policy_arr);
    let email_key = blinded_key(
        env,
        EMAIL_DOMAIN,
        link_hash,
        strkey,
        Some(&policy_arr),
        claim_salt,
    );
    let email_args: soroban_sdk::Vec<Val> = vec![env, email_key.into_val(env)];
    let email_attested: bool = env.invoke_contract(
        verifier,
        &Symbol::new(env, "is_email_attested"),
        email_args,
    );
    if !email_attested {
        panic!("email not attested for this recipient");
    }
}

/// Shared by `claim_link` and `claim_split`: requires the verifier to have
/// recorded a ZK attestation for `claim_key`.
fn require_attested(env: &Env, verifier: &Address, claim_key: &BytesN<32>) {
    let args: soroban_sdk::Vec<Val> = vec![env, claim_key.clone().into_val(env)];
    let attested: bool = env.invoke_contract(verifier, &Symbol::new(env, "is_attested"), args);
    if !attested {
        panic!("no valid ZK attestation for this claim");
    }
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LinkInfo {
    pub creator: Address,
    pub amount: i128,
    pub asset: Address,
    pub policy_type: u32,
    pub policy_params: Bytes,
    pub expires_at: u64,
    pub claimed: bool,
}

#[contracttype]
pub enum DataKey {
    VerifierAddress,
}

/// One recipient's allocation inside a split link. `claimed` tracks stroops
/// already paid out (to the recipient plus any relayer fee deducted from
/// their claims), so partial claims accumulate toward `allocated` instead of
/// a single boolean flag.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SplitRecipient {
    pub address: Address,
    pub allocated: i128,
    pub claimed: i128,
}

/// Multi-recipient, partial-claim escrow. A link with a single recipient is
/// the "partial claims" mode from #120 (one payee drawing down the balance
/// over several claims); a link with more than one recipient is the "split
/// recipients" mode (a fixed payee list, each with its own share). Both share
/// one state machine and one storage layout — see docs/architecture.md §5.1.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SplitLinkInfo {
    pub creator: Address,
    pub amount: i128,
    pub asset: Address,
    pub policy_type: u32,
    pub policy_params: Bytes,
    pub expires_at: u64,
    /// Minimum size of a non-final partial claim, as basis points of that
    /// recipient's `allocated` share. A claim that closes out a recipient's
    /// entire remaining allocation is always allowed regardless of this
    /// floor, so dust remainders can still be swept in one transaction.
    pub min_claim_bps: u32,
    pub recipients: Vec<SplitRecipient>,
    /// Set by `cancel_split_link` (sender, before expiry) or
    /// `refund_split_link` (permissionless, after expiry). Once true, no
    /// further claims are possible and the link is terminal.
    pub closed: bool,
}

/// Split-link storage keys are wrapped in this enum so they can never
/// collide with the plain `BytesN<32>` keys `create_link` writes directly —
/// the two link kinds live in disjoint key spaces even if the same 32 bytes
/// were reused as both an `id` and a split-link `id`.
#[contracttype]
pub enum SplitDataKey {
    SplitLink(BytesN<32>),
}

#[contract]
pub struct AtreusContract;

#[contractimpl]
impl AtreusContract {
    pub fn __constructor(env: Env, verifier: Address) {
        env.storage()
            .instance()
            .set(&DataKey::VerifierAddress, &verifier);
        env.storage()
            .instance()
            .extend_ttl(STORAGE_TTL_THRESHOLD, STORAGE_TTL_EXTEND_TO);
    }

    pub fn create_link(
        env: Env,
        id: BytesN<32>,
        policy_type: u32,
        policy_params: Bytes,
        amount: i128,
        asset: Address,
        expiry: u64,
        sender: Address,
    ) {
        sender.require_auth();

        if env.storage().persistent().has(&id) {
            panic!("link already exists");
        }

        let token_client = token::Client::new(&env, &asset);
        token_client.transfer(&sender, &env.current_contract_address(), &amount);

        let link_info = LinkInfo {
            creator: sender.clone(),
            amount,
            asset: asset.clone(),
            policy_type,
            policy_params,
            expires_at: expiry,
            claimed: false,
        };

        env.storage().persistent().set(&id, &link_info);
        env.storage()
            .persistent()
            .extend_ttl(&id, STORAGE_TTL_THRESHOLD, STORAGE_TTL_EXTEND_TO);

        env.events()
            .publish((symbol_short!("created"), id), (sender, amount, asset));
    }

    pub fn claim_link(
        env: Env,
        link_hash: BytesN<32>,
        recipient: Address,
        claim_salt: BytesN<32>,
        relayer_address: Address,
        relayer_fee: i128,
    ) {
        // Soroban authorizes the complete invocation, including relayer_address
        // and relayer_fee. This makes the recipient's signature an explicit
        // approval of the exact compensation paid for this gasless claim.
        recipient.require_auth();

        // No plaintext secret here: transaction arguments are public, so passing
        // the secret would publish it on-chain. The ZK attestation below already
        // proves the claimer knows it.
        let strkey = recipient_strkey(&recipient);
        let claim_key = blinded_key(&env, CLAIM_DOMAIN, &link_hash, &strkey, None, &claim_salt);

        let mut link_info: LinkInfo = env
            .storage()
            .persistent()
            .get(&link_hash)
            .expect("Link not found");

        // Retrieve verifier early — needed by both the ZK attestation check and the
        // email-restricted policy check below.
        let verifier: Address = env
            .storage()
            .instance()
            .get(&DataKey::VerifierAddress)
            .expect("verifier not set");

        // If policy_type == 1 (email-restricted), verify the claimer's email
        // through the attestation system, not a plaintext argument. policy_params
        // holds the 32-byte email hash; the trusted attester must have recorded an
        // attestation under the matching blinded email key.
        check_email_policy(
            &env,
            &verifier,
            link_info.policy_type,
            &link_info.policy_params,
            &link_hash,
            &strkey,
            &claim_salt,
        );

        // Require a real ZK attestation for this claim before releasing funds. The
        // attestation is only recorded by VerifierContract::attest() after a trusted
        // attester has verified a real UltraHonk proof off-chain — see the doc comment
        // on VerifierContract::verify_proof for why this indirection exists.
        require_attested(&env, &verifier, &claim_key);

        if link_info.claimed {
            panic!("already claimed");
        }

        if env.ledger().timestamp() > link_info.expires_at {
            panic!("link expired");
        }

        // The `claimed` flag above is the double-claim guard; the old sha256(link_hash)
        // nullifier key was derivable by anyone and leaked which links were claimed.
        // Replay protection across proofs lives in VerifierContract's nullifier registry.

        // Token transfers accept signed amounts, so reject both negative fees and
        // fees that would leave the recipient with a negative payout.
        if relayer_fee < 0 || relayer_fee > link_info.amount {
            panic!("invalid relayer fee");
        }
        let recipient_amount = link_info.amount - relayer_fee;

        let token_client = token::Client::new(&env, &link_info.asset);
        if relayer_fee > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &relayer_address,
                &relayer_fee,
            );
        }
        token_client.transfer(
            &env.current_contract_address(),
            &recipient,
            &recipient_amount,
        );

        link_info.claimed = true;
        env.storage().persistent().set(&link_hash, &link_info);

        // Topic and data carry nothing: any field here would let the link creator
        // watch the chain and learn who claimed which link, and for how much.
        env.events().publish((symbol_short!("claimed"),), ());
    }

    pub fn claim_and_swap_link(
        env: Env,
        link_hash: BytesN<32>,
        secret: BytesN<32>,
        recipient: Address,
        router: Address,
        path: Vec<Address>,
        min_amount_out: i128,
        deadline: u64,
        relayer_fee: i128,
        relayer_address: Option<Address>,
    ) -> Vec<i128> {
        recipient.require_auth();

        // Verify secret: sha256(secret) must equal the stored link_hash.
        let secret_bytes = Bytes::from_array(&env, &secret.to_array());
        let computed = env.crypto().sha256(&secret_bytes);
        if BytesN::from_array(&env, &computed.to_array()) != link_hash {
            panic!("invalid secret");
        }

        let mut link_info: LinkInfo = env
            .storage()
            .persistent()
            .get(&link_hash)
            .expect("Link not found");

        if link_info.claimed {
            panic!("already claimed");
        }

        if env.ledger().timestamp() > link_info.expires_at {
            panic!("link expired");
        }

        if min_amount_out <= 0 {
            panic!("min_amount_out must be greater than zero");
        }

        if deadline < env.ledger().timestamp() {
            panic!("deadline expired");
        }

        // Validate path: must have at least 2 hops, start with escrowed token, end with different token
        if path.len() < 2 {
            panic!("invalid path length");
        }
        let first_asset = path.get(0).unwrap();
        let last_asset = path.get(path.len() - 1).unwrap();
        if first_asset != link_info.asset {
            panic!("path must start with escrowed asset");
        }
        if last_asset == link_info.asset {
            panic!("path target cannot be escrowed asset");
        }

        // Retrieve verifier for ZK and email policy checks
        let verifier: Address = env
            .storage()
            .instance()
            .get(&DataKey::VerifierAddress)
            .expect("verifier not set");

        if link_info.policy_type == 1 {
            if link_info.policy_params.len() != 32 {
                panic!("invalid policy params length");
            }
            let mut policy_arr = [0u8; 32];
            link_info.policy_params.copy_into_slice(&mut policy_arr);
            let expected_email_hash = BytesN::from_array(&env, &policy_arr);
            let email_args: soroban_sdk::Vec<Val> = vec![
                &env,
                link_hash.into_val(&env),
                recipient.into_val(&env),
                expected_email_hash.into_val(&env),
            ];
            let email_attested: bool = env.invoke_contract(
                &verifier,
                &Symbol::new(&env, "is_email_attested"),
                email_args,
            );
            if !email_attested {
                panic!("email not attested for this recipient");
            }
        }

        let args: soroban_sdk::Vec<Val> =
            vec![&env, link_hash.into_val(&env), recipient.into_val(&env)];
        let attested: bool =
            env.invoke_contract(&verifier, &Symbol::new(&env, "is_attested"), args);
        if !attested {
            panic!("no valid ZK attestation for this claim");
        }

        // Double-claim prevention via nullifier
        let link_hash_bytes = Bytes::from_array(&env, &link_hash.to_array());
        let nullifier_key =
            BytesN::from_array(&env, &env.crypto().sha256(&link_hash_bytes).to_array());
        if env.storage().persistent().has(&nullifier_key) {
            panic!("nullifier already used");
        }

        // Fee validation and deduction
        if relayer_fee < 0 || relayer_fee > link_info.amount {
            panic!("invalid relayer fee");
        }

        let swap_amount = link_info.amount - relayer_fee;
        if swap_amount <= 0 {
            panic!("invalid swap amount");
        }

        let token_client = token::Client::new(&env, &link_info.asset);
        if relayer_fee > 0 {
            let relayer = relayer_address
                .as_ref()
                .expect("relayer address required when fee is non-zero");
            token_client.transfer(&env.current_contract_address(), relayer, &relayer_fee);
        }

        // Transfer swap amount to router and execute swap to recipient
        token_client.transfer(&env.current_contract_address(), &router, &swap_amount);

        let router_client = SoroswapRouterClient::new(&env, &router);
        let amounts = router_client.swap_exact_tokens_for_tokens(
            &swap_amount,
            &min_amount_out,
            &path,
            &recipient,
            &deadline,
        );

        link_info.claimed = true;
        env.storage().persistent().set(&link_hash, &link_info);
        env.storage().persistent().set(&nullifier_key, &true);

        env.events().publish(
            (symbol_short!("clm_swap"), link_hash),
            (
                recipient,
                router,
                swap_amount,
                min_amount_out,
                relayer_address,
                relayer_fee,
            ),
        );

        amounts
    }

    pub fn refund_link(env: Env, link_hash: BytesN<32>) {
        let link_info: LinkInfo = env
            .storage()
            .persistent()
            .get(&link_hash)
            .expect("Link not found");

        link_info.creator.require_auth();

        if link_info.claimed {
            panic!("already claimed");
        }

        if env.ledger().timestamp() <= link_info.expires_at {
            panic!("not yet expired");
        }

        let token_client = token::Client::new(&env, &link_info.asset);
        token_client.transfer(
            &env.current_contract_address(),
            &link_info.creator,
            &link_info.amount,
        );

        env.storage().persistent().remove(&link_hash);

        env.events().publish(
            (symbol_short!("refunded"), link_hash),
            (link_info.creator, link_info.amount),
        );
    }

    /// Funds a multi-recipient / partial-claim escrow. `recipients[i]` is
    /// allocated `shares[i]` stroops; a single-entry list is the "partial
    /// claims" mode (one payee drawing the balance down over several
    /// claims), a multi-entry list is the "split recipients" mode. The
    /// escrowed `amount` is always `sum(shares)` — computed here, not taken
    /// from the caller — so creation can't under- or over-fund the payouts
    /// it promises. See docs/architecture.md §5.1 for the state machine.
    pub fn create_split_link(
        env: Env,
        id: BytesN<32>,
        policy_type: u32,
        policy_params: Bytes,
        asset: Address,
        expiry: u64,
        sender: Address,
        recipients: Vec<Address>,
        shares: Vec<i128>,
        min_claim_bps: u32,
    ) {
        sender.require_auth();

        let key = SplitDataKey::SplitLink(id.clone());
        if env.storage().persistent().has(&key) {
            panic!("link already exists");
        }

        let n = recipients.len();
        if n == 0 || n > MAX_SPLIT_RECIPIENTS {
            panic!("invalid recipient count");
        }
        if shares.len() != n {
            panic!("recipients/shares length mismatch");
        }
        if min_claim_bps as i128 > BPS_DENOMINATOR {
            panic!("invalid min claim bps");
        }

        let mut split_recipients: Vec<SplitRecipient> = Vec::new(&env);
        let mut total: i128 = 0;
        for i in 0..n {
            let address = recipients.get(i).unwrap();
            let share = shares.get(i).unwrap();
            if share <= 0 {
                panic!("share must be positive");
            }
            for j in 0..split_recipients.len() {
                if split_recipients.get(j).unwrap().address == address {
                    panic!("duplicate recipient");
                }
            }
            total = total.checked_add(share).expect("amount overflow");
            split_recipients.push_back(SplitRecipient {
                address,
                allocated: share,
                claimed: 0,
            });
        }

        let token_client = token::Client::new(&env, &asset);
        token_client.transfer(&sender, &env.current_contract_address(), &total);

        let link_info = SplitLinkInfo {
            creator: sender.clone(),
            amount: total,
            asset: asset.clone(),
            policy_type,
            policy_params,
            expires_at: expiry,
            min_claim_bps,
            recipients: split_recipients,
            closed: false,
        };

        env.storage().persistent().set(&key, &link_info);
        env.storage()
            .persistent()
            .extend_ttl(&key, STORAGE_TTL_THRESHOLD, STORAGE_TTL_EXTEND_TO);

        env.events().publish(
            (symbol_short!("splitnew"), id),
            (sender, total, asset, n),
        );
    }

    /// Claims up to `claim_amount` stroops from `recipient`'s allocation.
    /// Any amount less than the recipient's full remaining allocation must
    /// clear `min_claim_bps`, so a link can't be drained one dust-sized
    /// claim at a time; claiming the exact remainder always closes it out
    /// regardless of that floor.
    ///
    /// Unlike `claim_link`, this does not require a ZK secret-knowledge
    /// attestation: `create_split_link` names `recipient` as an on-chain
    /// `Address` up front, so there is no bearer secret to prove knowledge
    /// of, and `recipient.require_auth()` below is already the complete
    /// authorization. `policy_type == 1` (email-restricted) still applies,
    /// reusing `claim_link`'s email-policy machinery, for links that need
    /// an additional bound on top of the named address.
    pub fn claim_split(
        env: Env,
        link_hash: BytesN<32>,
        recipient: Address,
        claim_amount: i128,
        claim_salt: BytesN<32>,
        relayer_address: Address,
        relayer_fee: i128,
    ) {
        recipient.require_auth();

        let key = SplitDataKey::SplitLink(link_hash.clone());
        let mut link_info: SplitLinkInfo = env
            .storage()
            .persistent()
            .get(&key)
            .expect("Link not found");

        // Precedence: a link closed by a prior `cancel_split_link` or
        // `refund_split_link` in an earlier transaction rejects every claim
        // from here on, no matter how much of the recipient's allocation was
        // still unclaimed. Soroban has no concurrent execution, so "prior"
        // is simply ledger-close order — there is no race to resolve within
        // a single invocation.
        if link_info.closed {
            panic!("link closed");
        }
        if env.ledger().timestamp() > link_info.expires_at {
            panic!("link expired");
        }

        let strkey = recipient_strkey(&recipient);
        let verifier: Address = env
            .storage()
            .instance()
            .get(&DataKey::VerifierAddress)
            .expect("verifier not set");

        check_email_policy(
            &env,
            &verifier,
            link_info.policy_type,
            &link_info.policy_params,
            &link_hash,
            &strkey,
            &claim_salt,
        );

        let mut idx: Option<u32> = None;
        for i in 0..link_info.recipients.len() {
            if link_info.recipients.get(i).unwrap().address == recipient {
                idx = Some(i);
                break;
            }
        }
        let idx = idx.expect("not a recipient of this link");
        let mut entry = link_info.recipients.get(idx).unwrap();

        let remaining = entry.allocated - entry.claimed;
        if claim_amount <= 0 || claim_amount > remaining {
            panic!("invalid claim amount");
        }
        if claim_amount < remaining {
            let min_claim = entry.allocated * (link_info.min_claim_bps as i128) / BPS_DENOMINATOR;
            if claim_amount < min_claim {
                panic!("claim amount below minimum");
            }
        }

        // Same bound as `claim_link`: reject negative fees and fees that
        // would leave the recipient with a negative payout on this claim.
        if relayer_fee < 0 || relayer_fee > claim_amount {
            panic!("invalid relayer fee");
        }
        let recipient_amount = claim_amount - relayer_fee;

        entry.claimed += claim_amount;
        link_info.recipients.set(idx, entry);
        env.storage().persistent().set(&key, &link_info);

        let token_client = token::Client::new(&env, &link_info.asset);
        if relayer_fee > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &relayer_address,
                &relayer_fee,
            );
        }
        token_client.transfer(
            &env.current_contract_address(),
            &recipient,
            &recipient_amount,
        );

        // Bare topic, void data — consistent with `claim_link`'s unlinkable
        // event: no link hash, recipient, or amount for a chain-watcher to
        // join against.
        env.events().publish((symbol_short!("splitclm"),), ());
    }

    /// Sender-only clawback of every recipient's unclaimed remainder, only
    /// while the link is still within its cancel window (`now <=
    /// expires_at`). Already-claimed amounts are untouched — cancellation
    /// only reaches funds nobody has claimed yet. After expiry, use
    /// `refund_split_link` instead, which is permissionless like the
    /// existing `refund_link`.
    pub fn cancel_split_link(env: Env, link_hash: BytesN<32>) {
        let key = SplitDataKey::SplitLink(link_hash.clone());
        let mut link_info: SplitLinkInfo = env
            .storage()
            .persistent()
            .get(&key)
            .expect("Link not found");

        link_info.creator.require_auth();

        if link_info.closed {
            panic!("link already closed");
        }
        if env.ledger().timestamp() > link_info.expires_at {
            panic!("cancel window closed");
        }

        let mut remaining_total: i128 = 0;
        for i in 0..link_info.recipients.len() {
            let r = link_info.recipients.get(i).unwrap();
            remaining_total += r.allocated - r.claimed;
        }

        link_info.closed = true;
        env.storage().persistent().set(&key, &link_info);

        if remaining_total > 0 {
            let token_client = token::Client::new(&env, &link_info.asset);
            token_client.transfer(
                &env.current_contract_address(),
                &link_info.creator,
                &remaining_total,
            );
        }

        env.events().publish(
            (symbol_short!("splitcnl"), link_hash),
            (link_info.creator, remaining_total),
        );
    }

    /// Post-expiry sweep of every recipient's unclaimed remainder back to
    /// the creator — the split-link analogue of `refund_link`. Requires the
    /// creator's authorization, matching `refund_link`. Kept as a distinct
    /// entry point from `cancel_split_link` so the two time windows (before
    /// vs. after `expires_at`) stay simple to reason about independently,
    /// even though both are creator-gated and share the same sweep logic.
    pub fn refund_split_link(env: Env, link_hash: BytesN<32>) {
        let key = SplitDataKey::SplitLink(link_hash.clone());
        let mut link_info: SplitLinkInfo = env
            .storage()
            .persistent()
            .get(&key)
            .expect("Link not found");

        link_info.creator.require_auth();

        if link_info.closed {
            panic!("link already closed");
        }
        if env.ledger().timestamp() <= link_info.expires_at {
            panic!("not yet expired");
        }

        let mut remaining_total: i128 = 0;
        for i in 0..link_info.recipients.len() {
            let r = link_info.recipients.get(i).unwrap();
            remaining_total += r.allocated - r.claimed;
        }

        link_info.closed = true;
        env.storage().persistent().set(&key, &link_info);

        if remaining_total > 0 {
            let token_client = token::Client::new(&env, &link_info.asset);
            token_client.transfer(
                &env.current_contract_address(),
                &link_info.creator,
                &remaining_total,
            );
        }

        env.events().publish(
            (symbol_short!("splitrfd"), link_hash),
            (link_info.creator, remaining_total),
        );
    }
}

#[cfg(test)]
mod proptests;
mod test;
