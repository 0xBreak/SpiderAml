#!/usr/bin/env bash
# Verify a deployment on Sourcify (no API key; Blockscout and most explorers pick Sourcify matches up).
# Usage: scripts/verify.sh <chainId>
set -euo pipefail
CHAIN=${1:?chain id}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DEP="$ROOT/deployments/$CHAIN.json"
cd "$ROOT/contracts"

registry=$(jq -r .registry "$DEP")
forge verify-contract "$registry" src/SpiderRegistry.sol:SpiderRegistry --chain "$CHAIN" --verifier sourcify --watch \
  --constructor-args "$(cast abi-encode 'f(address,address)' "$(jq -r .owner "$DEP")" "$(jq -r .writer "$DEP")")"

send=$(jq -r .spiderSend "$DEP")
if [ "$send" != "0x0000000000000000000000000000000000000000" ]; then
  forge verify-contract "$send" src/SpiderSend.sol:SpiderSend --chain "$CHAIN" --verifier sourcify --watch \
    --constructor-args "$(cast abi-encode 'f(address,address)' "$registry" "$(jq -r .sendToken "$DEP")")"
fi
