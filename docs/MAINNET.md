# Before mainnet

What exists today, what must be true before SpiderRegistry and SpiderSend go to a main network, and what is still open. Written 2026-11-04 after the first full pre-release check; the testnet deployment is on Arbitrum Sepolia.

## What is already in place (and tested)
- **Contracts:** 31 Foundry tests (fuzz included). `SpiderRegistry` is `Ownable2Step` (the owner changes in two steps, so a typo cannot hand the contract away); only registered *writers* can call `setRisk`; the owner adds and removes writers. `SpiderSend` keeps the registry and the token as `immutable`: nobody can redirect it to another registry after deployment.
- **Sync from the data layer** (`bun run sync-registry`, or the admin "Registry" page): sends only the difference, waits for every transaction to be confirmed and stops on a revert; the database records an entry only after its batch succeeded, so a run can be stopped and repeated safely (checked: a second run finds 0 changes).
- **Guards added 2026-11-04** (`registry/sync.ts`, tests in `sync.test.ts`): a sync is refused, unless `--force` or the admin tick box is used, when it would remove more than 10% of the on-chain entries (at least 50), change more than 20,000 entries, pay more than 1 gwei per gas, or when the writer balance does not cover the estimated cost with a 30% margin. The cost is estimated before anything is sent and shown in the admin panel.
- **Chain choice:** `REGISTRY_CHAIN_ID` (default 421614, Arbitrum Sepolia). Arbitrum One (42161) is refused unless `REGISTRY_ALLOW_MAINNET=1` is also set, so a copied `.env` cannot write to mainnet by accident (`pickChain`, tested). Mainnet RPC: `ARBITRUM_RPC`.
- **Automatic sync is off** (`AUTO_SYNC_REGISTRY=0`): changes go out by a person pressing a button.

## Testnet state (2026-11-04)
9,966 critical EVM addresses (sanctions, exploits, drainers) written in 67 transactions, about 0.005 ETH of testnet gas; 5 random entries read back from the chain match the database; `checkTransfer(clean, flagged)` returns `allowed = false` with the flagged address as `worst`.

## Must be done before mainnet
1. **Owner is a Safe multisig**, not a single key (already in IDEAS). Move ownership with the two-step transfer and accept it from the Safe.
2. **A dedicated writer key** that holds only what gas needs, rotated by the owner (`setWriter`); never the owner key. On the server it lives in `.env` (mode 600); consider a smaller hot balance and a top-up routine.
3. **Decide the writer's blast radius.** Today a writer can set any category and level for any address, so a stolen writer key can make `SpiderSend` refuse any recipient until the owner revokes it and the entries are cleaned. Options (a contract change, so a redeploy and a re-audit): an owner-only `pause()` on `SpiderSend`; an `epoch` in the registry so the owner can invalidate every entry at once; a cap on entries per transaction.
4. **External audit** of both contracts (the Solidity auditor skill and the tests are not a replacement).
5. **Mainnet configuration review:** `REGISTRY_CHAIN_ID=42161`, `REGISTRY_ALLOW_MAINNET=1`, `ARBITRUM_RPC`, the fee limit in `DEFAULT_LIMITS` (1 gwei is generous for Arbitrum One), real gas numbers measured on mainnet (testnet: about 3.8 million gas for a batch of 150 entries).
6. **Monitoring:** an alert when the writer balance is low or when changes have been pending for more than a day (the admin page shows both now, nothing pages anyone yet).
7. **Runbook** for a bad write: remove the writer, fix the data, `--force` only after a person has looked at the diff, repeat.
8. **Wording:** the /send page promises that the contract refuses sanctioned and exploit addresses. That is true only while the registry is filled and current; say "testnet" there until mainnet, and keep an "as of" date.

## Open questions
- Which categories should block on mainnet (now: sanctioned, exploit, phishing at level 3)? Frozen-by-issuer labels are deliberately *not* on-chain (severity 2).
- Who may press the button: the admin panel is behind Cloudflare Access with one allowed e-mail; a second person would be needed for a multisig-style process.
