#!/usr/bin/env bash
# Run the whole thing locally: data layer (../spideraml-data or $DATA_DIR) on :8787 and the site on :3000.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DATA_DIR=${DATA_DIR:-$HOME/spideraml-data}
(cd "$DATA_DIR" && bun run dev) &
DATA_PID=$!
trap 'kill $DATA_PID 2>/dev/null' EXIT
cd "$ROOT/web" && npm run dev
