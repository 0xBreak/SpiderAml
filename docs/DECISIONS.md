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

## Infrastructure (proposed, waiting for confirmation)

- Domain `spideraml.com` is on Cloudflare → Cloudflare in front of everything (DNS, TLS, WAF, cache).
- Heavy analytics (log scans for whales/holders, ported from Chainscope) need long-running requests and in-memory
  caches → the data layer runs as a normal Bun service, not as a Worker.
- Proposed: one small VPS running two containers — `web` (this repo) and `data` (private repo) — plus `cloudflared`.
  The tunnel exposes only `web`; `data` has no public route at all and is reached from `web` over the private Docker
  network with a shared secret. No open inbound ports on the server.
