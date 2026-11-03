#!/usr/bin/env bash
# Tell Bing and Yandex (IndexNow) that pages are new or changed: ./scripts/indexnow.sh https://spideraml.com/blog/x ...
# The key file lives in web/public/547595058eed4453781992c1c2b06b97.txt (public by design: it proves the site is ours). Run after a deploy.
set -euo pipefail
[ $# -ge 1 ] || { echo "usage: $0 <url> [<url>...]"; exit 1; }
urls=$(printf '"%s",' "$@"); urls=${urls%,}
curl -fsS -X POST https://api.indexnow.org/indexnow -H 'Content-Type: application/json; charset=utf-8' \
  -d "{\"host\":\"spideraml.com\",\"key\":\"547595058eed4453781992c1c2b06b97\",\"keyLocation\":\"https://spideraml.com/547595058eed4453781992c1c2b06b97.txt\",\"urlList\":[$urls]}" -w '\nHTTP %{http_code}\n'
