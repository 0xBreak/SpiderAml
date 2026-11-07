# Decisions

Short log of why things are the way they are. Newest at the bottom of each section.

## Product

- **Rebuilt from the hackathon prototype, no backward compatibility.** Its contracts, relayer, frontend and threat DB
  are removed; their history stays in git.
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
  (liquidity, trading, holders, whales) almost unchanged; the hackathon prototype gave the Forta datasets and curated incidents.
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

## Metrics and operations

- **Own metrics, no third-party tracker:** page views are counted server-side in middleware (no client script, no
  cookies); clicks on `data-track` elements and outbound links go through a tiny write-only beacon `/api/e`;
  product events (check result, token/whales network, report category) are sent from the server. The data layer stores
  only `hash(daily salt + IP + UA)` — the salt of a past day is deleted — so visitors are countable per day but not
  traceable. Report: `bun run stats`, and the admin panel → Статистика.
- **Checked addresses are kept in metrics** (owner decision 2026-10-27): what was checked, the result, network and
  country (from Cloudflare) per event, to see demand in the admin panel. No IPs. Requests to paths that do not exist on
  the site (scanners looking for .git, WordPress, .env) are stored as "probe" and never counted as visitors.
- **Cloudflare Web Analytics** allowed in the CSP so it can be switched on in the dashboard for countries/browsers.
- **Deploy = one VPS + Docker Compose + Cloudflare Tunnel** (files in the private repo `deploy/`). No inbound ports
  except SSH; the data container publishes nothing; logs rotate; SQLite in a named volume; `bun run backup` makes a
  consistent copy (`VACUUM INTO`), 14 kept. Built and run end-to-end locally before writing this.
- **Own lists = CSV files in `data/own/`** (bind-mounted), imported like any other source; bad rows are skipped and
  logged. `bun run export` writes private CSV exports.
- **Blog drafts** (`draft: true`) show in development and are hidden (404) in production.
- **Two languages, Russian and English, picked automatically** (owner request 2026-10-27). Order: the visitor's choice
  (RU/EN switch in the header → `/lang`, a functional `lang` cookie for a year, no tracking) → browser languages
  (Russian for ru/uk/be/kk/ky/uz/tg/az/hy/ka readers) → English for everyone else. Same URLs for both languages;
  `<html lang>` and page titles follow. Wording lives next to each page as a `{ ru, en }` dictionary; shared texts are
  `texts(locale)` in `web/src/lib/texts.ts`. Blog posts stay Russian (the English list says so).
- **Traffic source = `?src=` label, then Referer, then in-app browser.** Telegram, Instagram and other apps send no
  Referer, so a shared link like `spideraml.com/?src=telegram` is the reliable way; without it the app is guessed from
  the User-Agent.
- **Token score is fairer to real tokens** (owner report on KGST, 2026-10-27). Stablecoins (CoinGecko category) skip
  holder concentration and owner powers — an issuer holding unissued supply and mint/freeze rights is how they work.
  Liquidity counts centralised-exchange order books (CoinGecko "−2% depth") as well as DEX pools. Exchange wallets
  (Binance, OKX… by explorer label) are not counted as large holders. The page explains each adjustment.
- **"Fraud signals in databases" badge comes only from databases**, never from our own token heuristic (it used to
  say "possible scam" for any token the heuristic rated high — that read as an accusation).
- **Same address, other network**: if a contract address is a known token on another network but not on the one
  checked (KGST exists on BNB Chain; an unrelated contract sits at the same address on Ethereum), the check and token
  pages say so and link to the right network. Source: CoinGecko coin list, downloaded once a day.
- **Terms of use and privacy pages** (`/terms`, `/privacy`, both languages, linked in the footer) describe exactly what
  the code does; metrics events are now deleted after 13 months (`RETENTION_DAYS` in the data layer). Source licences
  are listed on `/terms`. Source ages are not shown on the site (owner decision: the lists are kept up to date and
  extended by hand). Not reviewed by a lawyer.
- **Front end = the other developer's redesign, our features ported onto it** (2026-10-28). Base: the "Perpetuity" UI
  (Next.js 16, Tailwind 4, shadcn primitives, next-intl with `/en` URLs). Brought over from our earlier version: score
  breakdown instead of "Reasons", Tron and ENS in the AML check, checksum error, other-network notice and CoinGecko
  failure notice, stablecoin / exchange-liquidity context, "fraud signals in databases" badge, terms and privacy pages,
  source labels and link-preview analytics, wording without slogans. All pages are translated through
  `messages/ru.json` + `messages/en.json`; the earlier page-local dictionaries were converted into those files.
- **Language**: first visit without a stored choice gets English unless the browser lists a Russian-reading language
  (Accept-Language), crawlers and link-preview bots get the Russian default; the choice is the `NEXT_LOCALE` cookie
  (set by the switcher). Replaces next-intl's own detection, which sent e.g. German browsers to the Russian site.
- **Home page is rendered per request** (was prerendered every 6 h): the Docker build has no data layer, so a
  prerendered page shipped without stats and sources.
- **CI/CD for the site** (2026-10-28). GitHub Actions: `ci.yml` (types, tests, audit, build) on every pull request;
  `deploy.yml` on merge to `main` builds the image on an ARM runner and ships it to the server over SSH. The server
  never compiles the site (that build is what made it heavy). The SSH key is restricted by a forced command to one
  script that swaps the `web` container and rolls back if it is not healthy. No registry, no public image.
- **Google Analytics 4, only after consent** (owner request 2026-10-28). `NEXT_PUBLIC_GA_ID` (build variable `GA_ID`);
  empty = no Google code at all. A banner (Accept / Decline, equal weight) asks first; until "Accept" nothing from
  Google is loaded (no script, no cookies); the answer is kept in localStorage and can be changed from the footer
  ("Cookie settings"); declining deletes `_ga*`. Only the path is sent as the page address (the query string holds the
  address being checked); ad personalisation and Google signals are off. CSP allows Google hosts only when the id is
  set. Our own statistics stay: GA misses ad-block users and everyone who declines, so its numbers are lower.

## SEO: sitemap, robots, canonical, hreflang (2026-10-28)
- Before: `/sitemap.xml` was a 404, `robots.txt` had no `Sitemap`, there was no `canonical`, and every page declared the home page as its translation (hreflang in the layout), which Google reads as an error.
- Now: `app/robots.ts`, `app/sitemap.ts` (static pages + blog posts, each entry with its language pair), `lib/seo.ts` gives every page its own canonical and hreflang (`x-default` = Russian). Result pages (`?address=…`, search text, page number) get `noindex, follow`: they are personal queries, the clean tool page is the one that ranks. JSON-LD: Organization, WebSite, WebApplication on the home page, Article on blog posts.
- Search Console is connected by a DNS TXT record in Cloudflare (domain property), no code on the site.

## Traffic review: what was kept, what changed (2026-11-03)
- **English site stays indexed.** A review claimed `/en` was untranslated: all 568 UI keys exist in both languages, `lang="en"`, canonical and hreflang are correct, and Google already lists the English pages (`site:spideraml.com/en`). No noindex, no robots block.
- **Own description per page.** Eight pages inherited the home description, so every result looked the same. Now `<Namespace>.metaDescription` in `messages/*.json` (ru + en), written around what people actually search ("AML check", "wallet address", sanctions lists).
- **Blog waits for its first article.** Both posts are drafts, so on the live site `/blog` only said "coming soon". Menu link, home tile and sitemap entry appear once a post is published; until then `/blog` carries noindex.
- **No rows of zeros** in the home sources table (user reports, own lists) until they have content.
- **Owner flag.** Open any page with `?me=1` once: a cookie `spider_skip=1` (1 year) keeps that browser out of our statistics (server events, page views, clicks) and out of Google Analytics; `?me=0` removes it. It is set only for whoever opens that link, visitors never get it.
- Checked and left as is: per-IP limits (check 20/min, token 12/min, report 5/min), address format checks before any outside call, cache on every outside call (GoPlus 10 min), one-step redirects, admin behind Cloudflare Access, only SSH open on the server.
- **Token score is not a verdict on the project.** When holder concentration could not be assessed (`skip_concentration`) the token card shows a warning badge "Incomplete score · N/100" instead of a plain "Low", and the address check says so in its token row. The card hint states that the score is technical only and cannot see organised fraud. Not done (needs the data layer): a note when DEX liquidity is negligible; scam-token labels from public sources.
- **No personal text in the statistics.** People paste e-mails and names into the address field, and failed checks stored that text. `safeTarget()` keeps an address or ENS name and replaces anything else with `[not an address, N chars]` (check and token pages). Rows written before this change are not touched; cleaning them is a separate, confirmed step with a backup first.
- **Small leftovers:** real `alt` text for token logos and venue icons; `/cdn-cgi/` disallowed in `robots.txt`; IndexNow key file in `web/public` and `scripts/indexnow.sh` (run it after a deploy to tell Bing and Yandex about new pages).
- **Stablecoin freezes** (2026-11-03). New source `stablecoin-freezes`, category `frozen`, severity 2 (an issuer's compliance action, not proof of a crime; not pushed to `SpiderRegistry`). Tether USDT on Ethereum and Tron, Circle USDC on Ethereum, Arbitrum and Polygon: every blacklist and release event is stored, the newest one per address decides, so an unfrozen address leaves the list. EVM events come from Etherscan's V2 log API, Tron from TronGrid (no key); each run continues from a stored cursor (first run about 3 minutes, later ones seconds). First full run: 12,689 addresses frozen right now. Base, Optimism and Avalanche are not covered (free Etherscan plan, and QuickNode reads only 10,000 blocks per request).
- **Bitcoin checks** (steps 1 and 2): `1…`, `3…`, `bc1…` addresses are validated (checksum) and looked up in labels and sanctions; counterparties of the latest 25 transactions come from mempool.space with Blockstream as a fallback (no key; mempool.space is unreachable from some networks, so the fallback matters). No GoPlus for Bitcoin.
- **Sanctioned-address pages** `/sanctions/<address>`: what the regulator published and a link to the record, linked from the sanctions table; not listed in the sitemap yet.
- **Clear button (×)** in every address field (shared `ClearInput`): an address pasted by mistake takes one tap to remove instead of deleting letter by letter on a phone.
- **Data freshness is shown, not hidden** (2026-11-03). The two biggest label sets are frozen snapshots: `etherscan-labels` was last changed by its author on 2023-10-01 and Forta's labelled datasets on 2023-01-26 (we re-download them every few hours, but nothing new arrives). The sources table on the home page now shows the date of the data (newest upstream commit, checked through the GitHub API on every ingest) instead of our download time, in warning colour when it is older than a year. Our own live coverage of fresh incidents is GoPlus.
- **GoPlus findings are kept** as a separate source `goplus-seen` ("GoPlus findings saved by SpiderAML"). When a live check returns a risk flag (severity 2 or 3) for an address, it is stored as a label of that source: later checks and counterparty lookups see it (before, counterparties were matched only against our stale base). Not copied: `sanctioned` flags (official lists come from our own ingest). A finding is stored once; a team exclusion (false positive) hides it like any non-official label. Not verified: GoPlus's terms on keeping their answers; the source is named everywhere it is shown, and the Terms page says the flags are kept.
- **Ethereum Fraud Dataset as a weak source** (2026-11-03). Source `eth-fraud-dataset`: 50,953 addresses a public research dataset (Ishmukhamedov, 2025, CC-BY-4.0, DOI 10.57967/hf/6373; data to July 2025) marks as scam, reduced to phishing / scam / ponzi / rugpull / exploit. **Severity 1**: shown in the check, never a high score, not counted as a risky counterparty (that needs severity 2); a flag GoPlus confirms is saved separately and counts. Why weak: the labels are merged from about twenty lists with no per-address source, and a GoPlus cross-check of 70 random addresses new to us confirmed 19% (43% for addresses we already had). Left out on purpose: "hack alert; take-action" (Etherscan tags on wallets at risk after the Multichain hack, victims, not attackers; about 4,000), the Parity bug, spam, dust and zero-value transfers. It is a static snapshot (file `data/external/eth-fraud-dataset.csv`, built by `make_eth_fraud_dataset.py`); the author is named on the Terms page as the licence requires. The 92 GB of transactions are not used.
- **Linked addresses graph** (2026-11-04). The check shows the flagged addresses the checked Ethereum address has exchanged transfers with: a star diagram drawn on the server as plain SVG (no script, no new library, same on a phone) and a list with direction, assets, amounts, dates, the label and its source. The history is built offline from the public BigQuery `crypto_ethereum` dataset (seeds: our 13,611 serious EVM addresses; top 100 neighbours per seed and direction; ETH for all years, tokens from 2024, older tokens next month because of the 1 TB monthly free quota) and loaded with `bun run load-links` into table `links`. Direction matters: an address that sent funds to a phishing address is far more often a victim than a culprit, so those links are drawn dashed and neutral. Links are shown for information and are NOT part of the score for now. Ethereum addresses only (no Tron, no Bitcoin); data refreshed by hand, about monthly. Layout is pure functions in `web/src/lib/graph.ts`.
- **First real run of the links history** (2026-11-04). BigQuery (project in sandbox mode, no billing): ETH transfers all years, 490 GB, 2 h 19 min; token transfers from 2024, 410 GB, 1 h 55 min; both within the 1 TB monthly free quota. Result: 379,854 links for 10,935 of the 13,611 flagged seed addresses (80%), about 35 neighbours per seed, newest transfer 3 November 2026; 216,953 "in" and 162,901 "out". Measured on 2,000 random ordinary addresses (a rough proxy): 1.3% have at least one link to a flagged address, mostly "sent to" a frozen or phishing address and only 12 of 116 links "received from". Rules that came out of the numbers: (1) an address linked to over 100 flagged ones is infrastructure (the USDT contract alone touches 2,670) and shows no links; (2) token names are trusted only for the real contracts (USDT, USDC, DAI, WETH, WBTC), look-alike tokens ("USDТ" with a Cyrillic letter) are shown as plain name plus the start of the contract address; (3) "sent to" a phishing, scam or frozen address is drawn neutral. Token transfers before 2024 follow in December (the free quota renews).
- **Pre-release check, what it found and fixed** (2026-11-04). Run on a local copy of the whole stack (data layer with real sources, 12,699 freezes, 50,953 weak labels, 379,854 links, plus the site on top; every page in ru and en, the admin, real addresses of every kind) and the contracts. Fixed: (1) the USDT contract itself showed "frozen by Tether, high risk 60" (Tether blacklisted its own contract in 2018 so nobody sends USDT to it): issuer contracts are now left out of the freezes; (2) well-known wallets showed "linked addresses" that were only spam: zero-value transfers (address poisoning) and look-alike tokens with huge amounts; a link now needs a real amount (ETH or WETH from 0.01, a stablecoin from 100, WBTC from 0.001; from 0.0001 / 1 / 0.00001 for sanctioned, exploit and mixer addresses), any other token never counts; (3) the "infrastructure" cut-off (over 100 flagged neighbours) also hid the links of an address that is itself flagged: it now looks only at the address as a neighbour; (4) the freezes ingest lost updates when Etherscan answered "rate limit (3/sec)": calls are now spaced 400 ms apart and retried. Also checked and fine: 31 contract tests, the deployed testnet contracts (code present, owner as in deployments, SpiderSend points at the registry, the data layer's REGISTRY_ADDRESS matches, the writer is registered), data layer returns 401 without the key, admin pages all answer, no errors in logs.
- **Open: the on-chain registry is empty.** `registry_state` has 0 rows and `AUTO_SYNC_REGISTRY=0`: 9,966 eligible critical addresses have never been written to SpiderRegistry on Arbitrum Sepolia, so SpiderSend, which asks only that registry, blocks nothing today although the /send text says it refuses sanctioned addresses. Needs a manual sync from the admin "Registry" page (testnet gas from the writer key, 0.01 ETH on it now) before the /send claim is true.
- **Frozen addresses are visible** (2026-11-04). Frozen funds were only a finding inside an address check, which nobody could find. Now: a badge in the verdict header, a "Frozen by Tether" example on the home page and a tab next to sanctions, `/sanctions/frozen`, with every address frozen right now (about 11,500 addresses, 12,699 rows over Tron and Ethereum USDT and Ethereum, Arbitrum and Polygon USDC): search by address, filter by network and asset, date, link to the freezing transaction, a link to the full check. The newest event of each (network, asset, address) decides, so a released address is not listed; the issuers' own contracts are left out. Data comes from a new endpoint `/v1/frozen` (the site still has no public API: the page reads it on the server). The wording says that a freeze is the issuer's decision, not proof of a crime, and that an address can be released. Needs the data layer deployed before the tab shows anything.
- **ScamSniffer is read from `all.json`, but its addresses are old** (2026-11-04). `blacklist/address.json` has 2,530 addresses; the `address` key of `blacklist/all.json` has 4,607 (2,077 more, none missing from the old file). The publisher's README says both address lists are no longer updated (last change February 2024); only the domains in the same file are refreshed daily, which is why the file's commit date is today. So the ingest reads `all.json` (fallback: the old file) for coverage, and the source's date is fixed to 2024-02-28, not the repository's newest commit, so the home page shows the real age of the addresses. An earlier note here and the README claim of daily updates are wrong for the addresses. Licence: GPL-3.0 per the repository; we show only "listed by ScamSniffer" with a link, not a copy, but this needs a decision before paid services.
- **Ingest refuses a truncated public list** (2026-11-04). A source with an upstream repository cannot replace its data when the new list is empty or lost over 30% of the previous rows (only when the previous list had 50 or more); the previous copy stays and the source shows the error. `INGEST_FORCE=1` allows a deliberate cut. Idea taken from an outside review of a separate screening tool.
- **Expanding the base through links, tested and NOT adopted** (2026-11-04). Idea: unlabeled addresses that received funds from many of our flagged addresses (cash-out or collector wallets) are probably risky too. From the 380k links: 89,897 unlabeled addresses received from at least one flagged seed, 2,130 from five or more, 907 from ten or more. Checked against live GoPlus on random samples: 0 of 40 (linked to 10 or more flagged seeds) and 1 of 40 (5 to 9) were flagged. Most of them are probably exchange deposit or sweep wallets and other infrastructure, so the signal is far too weak to label anyone; nothing was added to the base. Links stay informational. If tried again, it needs a second signal (contract or wallet age, outgoing destinations, a known service) and a larger independent check.
- **Circle freezes on Base, Optimism and Avalanche** (2026-11-04). Etherscan's free plan does not cover these chains and public RPC nodes refuse full-history logs, so the USDC `Blacklisted` / `UnBlacklisted` events are read from our own QuickNode in windows of 10,000 blocks (four in parallel), from the block the contract appeared at, with a cursor that moves only past fully read windows (`bun run freezes-backfill` reads everything, about 1 to 1.5 hours for the three chains; the regular ingest takes 600 windows per run). First full run: Base 463 events added / 92 removed, Optimism 583 / 93, Avalanche 588 / 96. Active frozen labels now 14,191 (was about 11,500): Ethereum 3,532, Tron 8,178, Arbitrum 499, Polygon 490, Base 516, Optimism 487, Avalanche 489. The Frozen tab lists the three new chains. Not added: USDT on these chains (bridged or USDT0 contracts, to be checked).
- **Token lists as neutral "who is this" labels** (2026-11-04). Source `mew-tokens`: the aggregated token files of MyEtherWallet's `ethereum-lists` (MIT) for Ethereum, BNB Chain, Polygon, Arbitrum, Base and Optimism, 14,003 labels "Token: Name (SYMBOL)", severity 0 (not a risk signal), 12,132 addresses new to the base. Distinct addresses in the base: 94,895 before, 107,027 after (serious risk 24,470, weak 39,140, neutral and the rest the others). Checked and left for later: Trust Wallet `assets` (MIT; 12,478 token addresses, 12 thousand separate files, not an aggregated list), DeFiLlama `/protocols` (3,157 token addresses, 2,936 new; terms not read). The "Whose address is this" card on the check page now reads these labels (and the Etherscan-family tags) in plain words, and hides labels that say nothing about an owner (hack-victim marks, sybil lists, airdrop farmers).

- **Frozen addresses got their own page `/frozen`** (2026-11-04). Keyword research (autocomplete, not volumes) showed that "USDT blocked / frozen / blacklisted" is a separate intent from "AML check" and from sanctions. So the list moved out of the sanctions tabs to a top-level page with its own title, a quick verdict for a full address (frozen with date and transaction, or not found, with a note that it does not mean safe), a four-question FAQ and a menu item. `/sanctions/frozen` redirects permanently (RU and EN). The sanctions tabs component was removed. The AML texts are untouched. Local only so far: needs a PR, the owner's Merge and CI.

- **Search-engine setup** (2026-11-04). Bing Webmaster showed `/token` as "discovered, not crawled" and flagged `Host:` in robots.txt as a syntax error. Done: the Yandex-only `Host` directive removed from robots.txt; `lastmod` dates in the sitemap (a fixed release date for static pages, today for the daily-data pages `/sanctions` and `/frozen`); FAQPage structured data on `/frozen`, matching the visible text; all sitemap URLs sent once to IndexNow (Bing and Yandex, answer 202; the key file was already published). Titles of `/check` and `/token` now carry the search phrases while the H1 stays short. Crawl speed itself is Bing's decision and slow for a new domain: external links and waiting help, repeated "request indexing" does not. Cloudflare Bot Fight Mode / AI-bot blocking should be checked by the owner, because a challenge for the real Bingbot cannot be tested from outside.

- **Etherscan-family labels stay, shown as "found in the Etherscan database"** (2026-11-07). Sources `etherscan-labels` (about 32,000 addresses, 29,635 of them with no other source) and the newer copy `eth-labels` (MIT repository, 61,702 addresses only from it; not on the site yet) come from Etherscan's name tags and label cloud. Etherscan's terms forbid scraping and reproducing its labels without consent, so this is a known legal risk, accepted for now by the owner, who will also ask Etherscan's support for permission. Mitigation built in: the check page and the owner card do not present these labels as our own finding; they say "Found in the Etherscan database" with a link to the address page on the matching explorer (`web/src/lib/etherscan.ts`), the source is named "Etherscan address labels", and there is no public API or bulk download. If Etherscan objects: hide the sources `etherscan-labels` and `eth-labels` in the data layer (the loss would be about 29,600 neutral owner tags and about 130 serious-risk addresses today). The GraphSense packs derived from Etherscan (`etherscan-*`, `defi-fraud-masterthesis`) are NOT taken.

- **GraphSense TagPacks, stage 1** (2026-11-07). New label source `graphsense` (MIT, Iknaio Cryptoasset Analytics GmbH; notice in `~/spideraml-data/THIRD_PARTY_LICENSES.md`). Ten parallel reviews (extraction, severity policy, overlaps, speed, scores, exchange wallets, other sources, Tron, display, licences) led to a deliberately small first step: only reviewed packs, **neutral labels only** (exchanges, DeFi protocols, mining pools, CoinJoin tags), no risk labels. Result on a copy of the base: 75,835 labels for 75,819 addresses (Bitcoin 75,079, Ethereum 724, Tron 32), fetched in 15 s, scores of clean, sanctioned and tagged addresses checked on live Bitcoin addresses. Left out on purpose: the 336,000 BitMEX cluster addresses (one exchange, heuristic), extremism and terrorism packs, sanctions copies (the official lists cover them), scraped Etherscan packs, and everything in the "wording needed" group (sextortion spam 62,500 addresses, ransomware, hack and ponzi packs): stage 2 after a sample for personal data and wording templates. Rules that came out of the review for stage 2: sextortion and old ransomware are weak tags (severity 1), CoinJoin and Samourai are tags not signals, and a scam, phishing or hack address that the checked wallet only PAID is not a counterparty signal (victims pay). Implemented now: that last rule for Bitcoin counterparties.
- **Speed fixes found by the review** (2026-11-07). `linksFor` used `neighbor IN (SELECT ... FROM labels)` which scanned the whole labels table: 56 ms per Ethereum check on production, now 0.2 ms with `EXISTS` (identical results on 400 random seeds). `stats()` (home numbers) needed over a second at 600k rows: now cached for ten minutes and reset after every import.
- **OFAC cross-check** (2026-11-07). The independent daily extraction by 0xB10C (1,012 unique addresses) is fully contained in our production sanctions table; the table was refreshed the same morning. A first comparison against an older local copy suggested 14 missing addresses: that was a stale copy, not a gap.

- **Counterparties rewritten, one shape for every network** (2026-11-07). `~/spideraml-data/src/cps.ts` (EVM), `bitcoin.ts`, `tron.ts` now return the counterparties and the set the wallet only PAID. Two rules: (1) direction: a scam, phishing or hack address that the wallet only paid is not a signal (victims pay), sanctions and freezes count both ways; (2) dust: an incoming transfer under 1 USD (EVM, Tron: 1 USDT) or 3,000 satoshi does not make its sender a counterparty (address poisoning and dusting attacks make a victim look like a customer of the scammer). EVM results are cached for ten minutes (Zerion was asked again on every check). Bitcoin asks two public Esplora APIs hedged (the second after 1.5 s or at once on a failure; before, a dead first API cost up to 20 s). Tron got counterparties from the latest 50 USDT (TRC20) transfers through TronGrid: 0.4-1.1 s in a live test on 6 addresses, one request per second without a key (`TRON_PRO_API_KEY` raises the limits), 12-38 counterparties per wallet. The Tron note on the page was reworded accordingly.
- **Preflight before an import** (2026-11-07), idea taken from the goldenmatch-wallet-attribution demo repository (which also lowercases every address, a mistake for base58 chains that we do not copy): a source replaces its data only if at most 10% of a 2,000-row sample fails to parse as an address and every category/severity is valid. All current label sources measure 0% unparseable. Together with the shrink protection this stops a changed upstream format from silently emptying or polluting the base.

