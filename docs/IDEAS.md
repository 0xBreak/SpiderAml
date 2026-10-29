# Ideas (not planned, not implemented)

- SpiderSend with EIP-2612 `permit` so the first send needs one signature instead of approve + send.
- SpiderSend for several tokens behind an allowlist instead of one deployment per token.
- Registry owner → Safe multisig before any mainnet deployment.
- Tron registry via TronBox once there is a Tron integrator who would read it.
- Telegram alerts for reserve drops (from Kalkan) — the spec excludes bots for now.
- EU / UK / UN sanctions lists once they publish crypto addresses in a machine-readable form.
- Turkish interface (as in Kalkan); English versions of blog posts; `hreflang` / separate `/en` URLs for search engines.
- Etherscan page scrape and Chainabuse (needs a key) as extra live sources.
- Whale report CSV / Markdown export (the code exists in the data layer, the site does not expose it).
- Litestream backup of the SQLite file to R2/B2 when deployed.

## Data and accuracy (2026-10-29)

- **Stablecoin issuer freezes** (USDT on Ethereum and Tron, USDC on its EVM chains) as a new label category `FROZEN`, severity 2 (a freeze is not proof of a crime). Track add and remove events so an unfrozen address leaves the list; show the issuer, network, date and the event transaction. Not pushed to `SpiderRegistry`. Shown as a tab next to sanctions on `/sanctions`, not a separate section. The token contracts expose an "is blacklisted" view, so the checked address can also be asked live (verify the exact function names before building).
- **Ransomwhere** (ransomware payment addresses, mostly Bitcoin): free, access by approved application; OpenSanctions mirrors it, but check that licence first (non-commercial vs the paid services on the roadmap).
- **Bitcoin checks.** Step 1: accept a Bitcoin address, validate it, look it up in the labels (OFAC already has BTC addresses). Step 2: balance and the last transactions through mempool.space or Blockstream, because plain Bitcoin RPC cannot list transactions by address (QuickNode needs a Blockbook add-on, check the plan). Step 3 (large): common-input clustering.
- **Deeper tracing.** Counterparties two or three hops away with a falling weight, share of received funds coming from flagged addresses, known mixer and bridge contracts as a separate signal, interaction with known drainer contracts. Watch the RPC load and cost.
- **Arkham is not a data source:** no free API and no published licence, so no copying or scraping its labels. At most a "view on Arkham" link next to an address.
- **Token score honesty** (found with MCN Coin, BNB Chain `0xdd02…Cb79`, which shows "Low 5/100"): say "technical risk" next to the level plus a note that it does not mean the project is honest; show "assessment incomplete" instead of "Low" when holder concentration cannot be assessed or DEX liquidity is negligible; known scam tokens only as labels with a public source (regulator decision, court, organiser's admission).
- Token logo and venue icons: meaningful `alt` text instead of empty (Bing site scan warning on `/token` result pages, which are `noindex` anyway).
- Turn off Cloudflare "Email Address Obfuscation" (Scrape Shield) so Bing stops reporting `/cdn-cgi/l/email-protection` as a 404; close `/cdn-cgi/` in `robots.txt`.
- Open pages for single sanctioned addresses (official lists only) as long-tail search landing pages.
- IndexNow (key file under `web/public`) to tell Bing and Yandex about new pages and posts at once.
