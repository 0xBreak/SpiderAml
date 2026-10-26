# SpiderAML

Crypto address risk checks: sanctions, exploits, phishing and scams, with an on-chain registry that other contracts can
read and a "send with a check" contract for users.

Work in progress — rebuilt from the ChainGuard hackathon prototype. Why things are the way they are: `docs/DECISIONS.md`.

## Run locally

Two parts: this repo (site + contracts) and the private data layer `spideraml-data` (sibling directory).

```bash
cd ../spideraml-data && bun install && cp .env.example .env   # fill keys, set DATA_SECRET
bun run ingest                                               # first import of all lists (~15 s)
cd ../ArbitrumSingapore/web && npm install && cp .env.example .env.local   # same DATA_SECRET
cd .. && scripts/dev.sh                                      # data on :8787, site on http://localhost:3000
```

## Site pages

| Page | |
|---|---|
| `/` | Search and sections |
| `/check` | Address risk: score, level, possible scam, reasons with sources, official sanctions, counterparties, token risks, on-chain record |
| `/aml` | Token / contract: price, market cap, liquidity by DEX, buy/sell flow, top holders with labels, risk factors |
| `/whales` | Transfers of a token above a user-set USD threshold, per wallet, with labels |
| `/sanctions` | Official sanctions addresses (OFAC SDN), search, network and list filters, source links |
| `/send` | Send USDC through SpiderSend (Arbitrum Sepolia) with an on-chain and off-chain recipient check |
| `/blog` | MDX articles in `web/src/content/blog` |

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
