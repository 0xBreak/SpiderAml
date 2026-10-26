#!/usr/bin/env bash
# Deploy SpiderRegistry (+ SpiderSend if SEND_TOKEN is set) to one network and record it in deployments/<chainId>.json.
# Usage: scripts/deploy.sh <rpc alias from contracts/foundry.toml>   e.g. scripts/deploy.sh arbitrum_sepolia
# Env (.env): PRIVATE_KEY, WRITER_PRIVATE_KEY (or WRITER), <NETWORK>_RPC, optional SEND_TOKEN, OWNER.
set -euo pipefail
NET=${1:?network alias (arbitrum_sepolia | sepolia | bsc_testnet)}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
set -a; source "$ROOT/.env"; set +a
export WRITER=${WRITER:-$(cast wallet address "$WRITER_PRIVATE_KEY")}

cd "$ROOT/contracts"
forge script script/Deploy.s.sol:Deploy --rpc-url "$NET" --broadcast --slow ${FORGE_FLAGS:-} 1>&2

CHAIN_ID=$(cast chain-id --rpc-url "$NET")
# Arbitrum's block.number is the L1 block, so take the real L2 block from the receipt.
START=$(cast to-dec "$(jq -r '.receipts[0].blockNumber' "broadcast/Deploy.s.sol/$CHAIN_ID/run-latest.json")")
OUT="$ROOT/deployments/$CHAIN_ID.json"
jq --argjson b "$START" '. + {startBlock: $b}' "$OUT" > "$OUT.tmp" && mv "$OUT.tmp" "$OUT"
echo "deployed to chain $CHAIN_ID at block $START -> deployments/$CHAIN_ID.json" >&2
