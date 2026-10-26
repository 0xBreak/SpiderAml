# Decisions

Short log of why things are the way they are. Newest at the bottom of each section.

## Product

- **ChainGuard → SpiderAML, no backward compatibility.** The hackathon contracts, relayer, frontend and threat DB are
  removed; their history stays in git.
- **The product is the data and the site; contracts are one feature.** They let other contracts read our risk data
  on-chain and let a user send funds with a check in front. Everything else lives off-chain.
- **Robinhood Chain dropped.** Networks: Arbitrum, Ethereum, BNB Chain, plus Tron read-only (see Networks).
- **Data is public-source today** (OFAC, ScamSniffer, MEW, Etherscan labels, Forta…). We still keep it in the separate
  data layer and the site shows only results; that keeps the door open for our own labels later.

## Contracts (Phase 1)

- **One small registry instead of the staked-report/committee/mirror machine.** The data layer is the source of truth,
  so on-chain we only need `address -> (category, level)`. Staking, votes, appeals, cross-chain mirroring, on-chain
  enumeration and stats counters are gone. Each network gets its own registry; the data layer writes to each one
  directly, so there is no relayer and no N² mirroring between chains.
- **Record = one storage slot** (`category uint8, level uint8, updatedAt uint40`). The old `Flag` took 4 slots plus
  2 more for enumeration.
- **Packed batch input:** `setRisk(uint256[])` where each word is `account | category<<160 | level<<168`. One word per
  address instead of three ABI words — calldata is the main cost on Arbitrum. Upper bits must be zero (catches packing
  bugs). `pack()` is a pure helper for off-chain code. Level 0 deletes the record (gas refund).
- **Roles:** `Ownable2Step` owner manages writers; writers only write records. Owner can later be a Safe.
- **No evidence on-chain.** Events carry only address, category, level.
- **Block policy lives in the registry** (`BLOCK_LEVEL = 3`, `checkTransfer`). The separate Guard contract is gone:
  integrators call `checkTransfer` directly, one external call per transfer instead of two.
- **SpiderSend = "send with a check" for one token on one network.** User approves once; `send(to, amount)` refuses
  if either party is level 3, otherwise transfers `from → to` directly (never holds funds). First deployment: Circle
  test USDC on Arbitrum Sepolia. Token is a constructor argument, so another coin/network is just another deployment.
- **`SpiderGuardedERC20` moved to `contracts/examples/`.** Shows how a token issuer integrates; not deployed.
- **Verification via Sourcify** — Blockscout's API sits behind a Cloudflare challenge for CLI clients.
- **Deployments in `/deployments/<chainId>.json`** at the repo root, so the data layer and the site read the same file.

## Data layer (private repo `spideraml-data`)

- **Separate repo, separate process.** Bun + SQLite. Holds every list, the scoring, provider keys (QuickNode, Zerion)
  and the registry writer key. The site never sees raw lists or keys.
- **Merged from three projects:** Kalkan (TurkProject) gave the source list, OFAC parsing and scoring idea — ported from
  Python to TypeScript so the whole stack is one language; Chainscope (DashBoardContract) gave the token analytics
  (liquidity, trading, holders, whales) almost unchanged; ChainGuard gave the Forta datasets and curated incidents.
- **Sanctions come from the official OFAC SDN XML**, not a GitHub mirror. Each entry links to its OFAC record page.
  OFAC publishes no per-address listing date, so we store `first_seen` (first time our import saw it) and say so on
  the page.
- **Three official sanctions lists:** OFAC SDN (structured field), UK Sanctions List (FCDO XML) and the EU Consolidated
  List — the last two quote addresses in free text, so they are extracted with checksum validation (EIP-55-agnostic
  EVM, Tron base58check, Bitcoin base58check/bech32/bech32m) to avoid picking up registration numbers. UK and EU give a
  designation date; UK links to the per-entry page of the official UK search service, EU to the regulation in EUR-Lex.
  The UN list has no crypto addresses.
- **CoinGecko for markets** (user decision): on-chain data cannot see centralised exchanges, so 24h volume, CEX/DEX
  markets, spread and ±2% depth come from CoinGecko tickers. Works keyless; `COINGECKO_API_KEY` (free Demo) raises the
  limit. Zerion's 1-day volume undercounted (KGST: $4.8k vs $253k real).
- **Reports are free and off-chain** (user decision "report + show the price"): no payments/accounts per the spec, so
  a report costs nothing, is stored in the data layer and reviewed by hand (`bun run reports`). Not published.
- **A failed source never wipes data:** each source replaces its rows only after a successful download; OFAC refuses
  to replace the list if it parses fewer than 100 addresses.
- **Etherscan tag `blocked` = frozen by a stablecoin issuer**, mapped to "other / low", not "scam" — it hit the USDT
  contract itself as a false positive.
- **On-chain sync pushes only level-3 sanctions/exploit/phishing EVM addresses**, diffed against `registry_state`, in
  batches of 150. Manual (`bun run sync-registry`), or automatic after each import with `AUTO_SYNC_REGISTRY=1`.
- **Tron is read-only:** sanctions and GoPlus work for `T…` addresses (base58check validated); no Tron contract.

## Site (`web/`)

- **Next.js 15 (App Router), server-rendered.** Pages call the data layer from the server and send HTML; there are no
  public JSON endpoints. The only browser-side logic is the wallet on `/send` and one server action that screens a
  recipient. Heavy blocks stream in with Suspense so the page shows immediately.
- **Private channel:** `DATA_URL` + `DATA_SECRET` header, data layer bound to 127.0.0.1, constant-time secret check.
- **Per-IP rate limits** on the expensive pages (check 20/min, aml 12/min, whales 6/min).
- **No wagmi:** its WalletConnect/Coinbase connectors pulled 29 vulnerable packages. `/send` uses viem with the
  injected wallet only. `npm audit --omit=dev`: 0 vulnerabilities (postcss pinned via `overrides`).
- **Security headers:** CSP (scripts from self plus inline ones Next needs without nonces; connect only to self + the testnet RPC), HSTS,
  frame-ancestors none, nosniff, referrer policy. Secrets are checked to be absent from client bundles.
- **Naming:** `/check` is "AML-проверка" (lists and risk databases), the old `/aml` is now `/token` "Анализ токена"
  (market statistics and contract structure) with a permanent redirect — users read "AML" as the address check.
- **No search in the header** — it duplicated the page search. The header has the wallet button instead; one wallet
  connection (viem, injected) is shared by the whole site.
- **Home page explains the product:** what each tool answers, what it looks at, where the data comes from with live
  counts, how to read the score.
- **Russian only for now**, all wording in `src/lib/texts.ts` so another language is one more file.
- **Network list is duplicated** (`web/src/lib/networks.ts` and the data layer's `src/networks.ts`): the site only needs
  names and explorers. Adding a network = one entry in each plus a `QUICKNODE_RPC_URL_<NAME>` in the data layer.
- **Wording:** risk and its reason, never "fraudster" about an address; a disclaimer next to every score.
