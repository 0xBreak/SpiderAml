// Product events from the server (what people check and with what result). Fire-and-forget: metrics never slow or
// break a page. See the data layer's src/metrics.ts for what is stored (no IPs; checked addresses are kept for stats).
import "server-only";
import { headers } from "next/headers";

export type EventKind = "pageview" | "click" | "check" | "token" | "whales" | "sanctions_search" | "report" | "send_screen";

const hits = new Map<string, number[]>();

export async function trackEvent(kind: EventKind, label: string | null, path: string, extra: { target?: string | null; network?: string | null; ref?: string | null } = {}) {
  const secret = process.env.DATA_SECRET;
  if (!secret) return;
  const h = await headers();
  const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  // at most 60 events a minute per IP, so nobody can flood the table
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 60) return;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();

  fetch(`${process.env.DATA_URL ?? "http://127.0.0.1:8787"}/v1/events`, {
    method: "POST",
    headers: { "x-spider-key": secret, "content-type": "application/json" },
    body: JSON.stringify({ ip, ua: h.get("user-agent") ?? "", country: h.get("cf-ipcountry"), events: [{ kind, path, label, ...extra }] }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});
}
