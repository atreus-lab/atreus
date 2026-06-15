# Risk Analysis: ZK-PayLink

## Technical Risks

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Browser Proving Performance** | High | Use optimized WASM backends; provide a "Generation..." loader; keep circuits small (Stage 1 only). |
| **Soroban WASM Limits** | Medium | Use Protocol 25/26 optimizations; minimize contract state; separate Verifier from Business logic. |
| **Passkey Browser Support** | Low | Fallback to ephemeral keypair stored in LocalStorage for non-compatible browsers. |
| **Proof Sniping (MEV)** | High | Bind the ZK proof to the `recipient_address` within the circuit. |

## ZK Risks
- **Circuit Bugs**: A bug in the Noir circuit could allow anyone to claim funds.
  - *Mitigation*: Extensive unit testing of circuits with `nargo test`; use well-audited primitives (Pedersen).
- **Trusted Setup**: Noir uses the Plonk proof system which requires a universal trusted setup (SRS).
  - *Mitigation*: Use the standard Barretenberg SRS, which is well-established in the industry.

## UX Risks
- **Complexity Perception**: Users might be intimidated by "Zero-Knowledge" and "Passkeys".
  - *Mitigation*: Abstract all terminology; use "Magic Links" and "FaceID/TouchID" instead of "ZK" and "WebAuthn".
- **Lost Secrets**: If a user loses their PayLink, the funds are stuck.
  - *Mitigation*: Senders can "Reclaim" funds after an expiration period (Stage 1 feature).

## Hackathon Risks
- **Scope Creep**: Trying to build too many features in 2 weeks.
  - *Mitigation*: Stick strictly to the `mvp-scope.md` "MUST BUILD" list.
- **Integration Friction**: Connecting Noir WASM to Next.js can be tricky.
  - *Mitigation*: Start the integration (D12) early; have a non-ZK fallback ready for the demo if necessary.

## Long-Term (SCF) Risks
- **Regulatory Uncertainty**: Privacy tools are often scrutinized.
  - *Mitigation*: Focus on "Distribution Privacy" (safety/utility) rather than "Financial Anonymity" (laundering); emphasize compliance-ready features in the roadmap.
