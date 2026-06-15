# MVP Scope: ZK-PayLink (Hackathon)

## MUST BUILD (Core Requirements)
1.  **Create PayLink**: A simple UI for senders to input amount/asset and generate a secure link.
2.  **Fund PayLink**: Integration with Stellar/Soroban to escrow funds in a smart contract.
3.  **Claim PayLink**: A dedicated landing page for recipients to claim funds using the secret embedded in the link.
4.  **Passkey Integration**: Use WebAuthn for the claim process to ensure only the link holder can authorize the transfer.
5.  **Noir Proof Generation**: Client-side generation of a ZK proof that proves knowledge of the link secret without revealing it.
6.  **Soroban Verification**: A contract that verifies the Noir proof on-chain before releasing funds.
7.  **End-to-End Demo**: A clean, bug-free flow showing funds moving from Sender -> Escrow -> Recipient.

## SHOULD BUILD (Bonus / UX Improvements)
1.  **Link Expiration**: Allow senders to set a TTL (Time-To-Live) for the link, after which funds can be reclaimed.
2.  **Claim Status**: A dashboard for the sender to see which links have been claimed (without seeing recipient addresses if privacy is toggled).
3.  **Better UX**: Smooth transitions, loading states for ZK proof generation, and clear educational tooltips.

## DO NOT BUILD (Out of Scope)
1.  **Full Shielded Transfers**: We are focusing on link distribution, not a general-purpose privacy mixer.
2.  **Private Balances**: Users' overall wallet balances will remain public; only the link-specific transfer is obfuscated.
3.  **Complex Anonymity Pools**: We are not building a Tornado-style pool for this MVP.
4.  **Multi-chain Support**: Focus exclusively on the Stellar/Soroban ecosystem.
5.  **Enterprise Dashboards**: No complex multi-user permission systems for now.
