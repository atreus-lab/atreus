# Atreus

> A non-custodial, privacy-preserving payment infrastructure built on the Stellar network.

**Atreus** enables friction-free asset distribution via secure, shareable links — eliminating traditional Web3 onboarding barriers while maintaining absolute transactional privacy through Zero-Knowledge cryptography and hardware-bound Passkeys.

## Structure

```
atreus/
├── frontend/     → Next.js 15 web app (create/claim payment links)
├── backend/      → Express API service (link management)
├── contracts/    → Soroban smart contracts (escrow + ZK verifier)
├── docs/         → Vision, architecture, milestones, planning
└── README.md
```

All code repos are included as **git submodules** — see [`.gitmodules`](./.gitmodules).

## Docs

All project documentation lives in the [`docs/`](./docs) directory:

- [Vision](./docs/vision.md)
- [Architecture](./docs/architecture.md)
- [Problem Statement](./docs/problem-statement.md)
- [MVP Scope](./docs/mvp-scope.md)
- [Roadmap](./docs/roadmap.md)
- [Milestones](./docs/milestones.md)
- [ZK Design](./docs/zk-design.md)
- [Demo Flow](./docs/demo-flow.md)
- [SCF Vision](./docs/scf-vision.md)
- [Risk Analysis](./docs/risk-analysis.md)

## License

MIT
