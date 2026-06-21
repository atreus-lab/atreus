# Problem Statement

## The Challenge
Onboarding new users to Web3 remains one of the biggest hurdles. Traditional payment flows require the recipient to have a wallet address *before* they can receive funds. This "wallet-first" approach creates a massive barrier for non-crypto users.

## Existing Solutions & Their Limitations
1. **Direct Transfers**: Require the recipient's public key upfront.
2. **Standard Payment Links (TipLink, etc.)**: 
    - Often centralized or custodial.
    - Privacy is limited; the link secret is often revealed on-chain during claiming.
    - Lack of robust, hardware-backed authentication for "guest" users.

## The Atreus Approach
Atreus solves these problems by combining **Link-based Payments** with **Zero-Knowledge Proofs** and **Passkeys**:

- **Onboarding-Free**: Anyone with a browser can claim funds. No wallet download required initially.
- **Privacy-Preserving**: By using ZK proofs, the specific link being claimed can be obscured, and the secret is never revealed in plain text on the blockchain.
- **Secure**: Passkeys provide hardware-level security (FaceID/TouchID) for claiming, preventing link-theft or phishing.
- **Interoperable**: Built on Stellar for fast, low-cost global settlements.
