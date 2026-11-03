# Ideas (not planned, not implemented)

- SpiderSend with EIP-2612 `permit` so the first send needs one signature instead of approve + send.
- SpiderSend for several tokens behind an allowlist instead of one deployment per token.
- Registry owner → Safe multisig before any mainnet deployment.
- Tron registry via TronBox once there is a Tron integrator who would read it.
- Telegram alerts for reserve drops (from Kalkan) — the spec excludes bots for now.
- EU / UK / UN sanctions lists once they publish crypto addresses in a machine-readable form.
- Turkish interface (as in Kalkan); English versions of blog posts; `hreflang` / separate `/en` URLs for search engines.
- Chainabuse (needs a key) and MistTrack / SlowMist (needs a key, check the terms) as extra live sources. Scraping Etherscan pages is out: their terms forbid it and the label API is paid.
- Fresh incident wallets by hand: the exploiter addresses of recent hacks (Kelp DAO and others) from public post-mortems into the `manual` list, each with the report it came from.
- Whale report CSV / Markdown export (the code exists in the data layer, the site does not expose it).
- Litestream backup of the SQLite file to R2/B2 when deployed.

## Data and accuracy (2026-10-29)

- **Ransomwhere** (ransomware payment addresses, mostly Bitcoin): free, access by approved application; OpenSanctions mirrors it, but check that licence first (non-commercial vs the paid services on the roadmap).
- **Bitcoin checks, what is left.** Steps 1 and 2 are done (validation, labels, counterparties of the last 25 transactions via mempool.space / Blockstream). Left: balance and history on the page, and step 3 (large): common-input clustering.
- **Deeper tracing.** Counterparties two or three hops away with a falling weight, share of received funds coming from flagged addresses, known mixer and bridge contracts as a separate signal, interaction with known drainer contracts. Watch the RPC load and cost.
- **Arkham is not a data source:** no free API and no published licence, so no copying or scraping its labels. At most a "view on Arkham" link next to an address.
- Stablecoin freezes on Base, Optimism and Avalanche (Etherscan's free plan does not cover these chains, and our QuickNode plan reads logs in windows of 10,000 blocks, too small for a full history there). A paid Etherscan plan or a plan with wider log ranges would add them.
- Frozen addresses as their own tab next to sanctions on `/sanctions` (today they show up as a finding in the address check).
- Token score: a note when DEX liquidity is negligible (needs a new context code in the data layer).
