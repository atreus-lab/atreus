# Demo Flow

This script outlines the steps for a successful hackathon demonstration of ZK-PayLink.

## 1. Creation Phase
- **Actor**: Sender
- **Action**: 
    1. Navigate to `/create`.
    2. Input amount: `100 XLM`.
    3. Click "Create PayLink".
- **Visuals**:
    - Loader showing "Escrowing funds on Stellar...".
    - Success screen with a shareable URL: `https://zk-paylink.io/claim#secret_xyz123`.

## 2. Sharing Phase
- **Action**: Sender copies the link and sends it to Recipient (e.g., via Telegram or QR Code).

## 3. Claiming Phase
- **Actor**: Recipient
- **Action**:
    1. Recipient opens the link.
    2. Frontend detects the secret in the URL fragment.
    3. Recipient clicks "Claim with Passkey".
    4. Browser prompts for Biometric/PIN (Passkey).
- **Internal Logic**:
    - Frontend generates a ZK proof in the background.
    - Frontend submits the proof + Passkey signature to Soroban.

## 4. Verification Phase
- **Action**: Observe the "Transaction Successful" screen.
- **Verification**:
    - Show the Soroban Explorer (e.g., Stellarchain.io) to see the transaction.
    - Highlight that the `secret` was NOT passed as an argument, only a `proof`.
    - Show the balance being transferred to the Recipient's ephemeral or connected wallet.

## 5. Summary
- Emphasize: "The recipient didn't need a wallet to start, and the privacy of the link was maintained via ZK."
