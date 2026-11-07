// Product events from the server (what people check and with what result). Fire-and-forget: metrics never slow or
// break a page. See the data layer's src/metrics.ts for what is stored (no IPs; checked addresses are kept for stats).
import "server-only";
import { headers } from "next/headers";
import { cleanAddressInput } from "./action";
import { OWNER_COOKIE } from "./owner";

export type EventKind = "pageview" | "click" | "check" | "token" | "whales" | "sanctions_search" | "report" | "send_screen";

const ADDRESS_LIKE = /^(?:0x[0-9a-fA-F]{40}|T[1-9A-HJ-NP-Za-km-z]{33}|[13][1-9A-HJ-NP-Za-km-z]{25,34}|(?:bc1[02-9ac-hj-np-z]{8,87}|BC1[02-9AC-HJ-NP-Z]{8,87})|[^\s/:@]{1,100}\.[eE][tT][hH])$/;

/**
 * What a person typed into an address field, as it may be stored: an address or an ENS name stays; anything else
 * (people paste e-mails, names, phone numbers, tx hashes, which look like private keys) is replaced by a marker with its length,
 * so personal text never reaches the table. An address pasted with spaces or inside an explorer link is stored as the clean address.
 */
export const safeTarget = (text: string) => {
  const clean = cleanAddressInput(text);
  return ADDRESS_LIKE.test(clean) ? clean : `[not an address, ${text.trim().length} chars]`;
};

const hits = new Map<string, number[]>();

export async function trackEvent(kind: EventKind, label: string | null, path: string, extra: { target?: string | null; network?: string | null; ref?: string | null; trusted?: boolean } = {}) {
  // the target is whatever a visitor typed unless the caller says it comes from our own data (a sanctions entry)
  const { trusted, ...rest } = extra;
  const safe = { ...rest, target: rest.target == null ? null : trusted ? rest.target : safeTarget(rest.target) };
  const secret = process.env.DATA_SECRET;
  if (!secret) return;
  const h = await headers();
  if (h.get("cookie")?.includes(`${OWNER_COOKIE}=1`)) return; // the owner's own browser
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
    body: JSON.stringify({ ip, ua: h.get("user-agent") ?? "", country: h.get("cf-ipcountry"), events: [{ kind, path, label, ...safe }] }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});
}
