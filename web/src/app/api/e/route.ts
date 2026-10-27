// Beacon from the browser: a page view { nav, src?, ref? } or a click { label, path }.
// Write-only, tiny, rate-limited (in trackEvent); forwarded to the data layer.
import { NextResponse, type NextRequest } from "next/server";
import { trackEvent } from "@/lib/metrics";

/** Apps that open links in their own browser and say so in the user agent (they send no referrer). */
function inAppBrowser(ua: string): string | null {
  return /Telegram(?!Bot)/i.test(ua) ? "telegram" : /Instagram/i.test(ua) ? "instagram" : /FBAN|FBAV|FB_IAB/.test(ua) ? "facebook" : /VKAndroidApp|vkclient/i.test(ua) ? "vk" : /Line\//.test(ua) ? "line" : null;
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => null)) as { label?: unknown; path?: unknown; nav?: unknown; src?: unknown; ref?: unknown } | null;
  const nothing = new NextResponse(null, { status: 204 });
  if (!b) return nothing;

  if (typeof b.nav === "string") {
    if (b.nav.length > 200 || !/^\/[\w\-/]*$/.test(b.nav)) return nothing;
    // the English site lives under /en: count the same page once, remember the language as the label
    const lang = b.nav === "/en" || b.nav.startsWith("/en/") ? "en" : "ru";
    const path = b.nav.replace(/^\/en(?=\/|$)/, "") || "/";
    // source of the first page: own label (?src=telegram), then the referrer, then an in-app browser
    const tag = typeof b.src === "string" ? b.src.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 40) : "";
    const ref = typeof b.ref === "string" && b.ref.length <= 500 ? b.ref : null;
    const app = "src" in b || "ref" in b ? inAppBrowser(req.headers.get("user-agent") ?? "") : null;
    await trackEvent("pageview", lang, path, { ref: tag ? `src:${tag}` : (ref ?? (app ? `app:${app}` : null)) });
    return nothing;
  }

  if (typeof b.label !== "string" || typeof b.path !== "string" || b.label.length > 80 || b.path.length > 200 || !/^[\w\-:./ а-яё]+$/i.test(b.label)) return nothing;
  await trackEvent("click", b.label, b.path.replace(/^\/en(?=\/|$)/, "") || "/");
  return nothing;
}
