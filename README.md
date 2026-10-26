# SpiderAML

Crypto address risk checks: sanctions, exploits, phishing and scams, with an on-chain registry that other contracts can
read and a "send with a check" contract for users.

Work in progress — the project is being rebuilt from the ChainGuard hackathon prototype. See `docs/DECISIONS.md`.

## Contracts

| Contract | What it does |
|---|---|
| `SpiderRegistry` | `address -> (category, level)`; writers push batches from the data layer; `checkTransfer(from, to)` for integrators |
| `SpiderSend` | Sends one token with a registry check in front; refuses level-3 (critical) parties |
| `examples/SpiderGuardedERC20` | Example: an ERC-20 that screens every transfer |

Levels: 0 none · 1 low · 2 elevated · 3 critical (blocked).
Categories: SANCTIONED, EXPLOIT, PHISHING, SCAM, MIXER, OTHER.

```bash
cd contracts
forge test
forge coverage --ir-minimum
```

Deploy (keys and RPCs in `.env`, see `.env.example`):

```bash
SEND_TOKEN=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d scripts/deploy.sh arbitrum_sepolia
scripts/verify.sh 421614
```

### Testnet deployments

| Network | Registry | SpiderSend (token) |
|---|---|---|
| Arbitrum Sepolia (421614) | [`0xB7E00e6f9bD10E50F17E12847a83E9dCaA0429E2`](https://sepolia.arbiscan.io/address/0xB7E00e6f9bD10E50F17E12847a83E9dCaA0429E2) | [`0xAAd92220c7b1896efDcDc59D73552E7D97A34484`](https://sepolia.arbiscan.io/address/0xAAd92220c7b1896efDcDc59D73552E7D97A34484) (Circle test USDC) |
