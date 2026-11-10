// The visitor's address, used only for the per-minute limits and the visitor statistics (it is hashed there, never stored).
// In production the site sits behind Cloudflare Tunnel, which puts the real address in `cf-connecting-ip`; `x-forwarded-for`
// is whatever the client wrote and would let anyone pick a fresh "address" per request. So behind Cloudflare only Cloudflare's
// header counts, and a request that reached the container some other way shares one bucket. Locally (no CANONICAL_HOST) the
// proxy header is accepted, so dev and docker tests keep working.

export function clientIp(h: Headers): string {
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf;
  if (process.env.CANONICAL_HOST) return "direct";
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
