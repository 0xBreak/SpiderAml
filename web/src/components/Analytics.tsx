"use client";

import { useCallback, useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Google Analytics 4, loaded only after the visitor agrees. Without a stored "granted" nothing from Google reaches the
// browser (no script, no cookies). The id is public (it is in every page that uses GA) and comes from the build.
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || "";
const KEY = "spideraml:analytics";
export const OPEN_EVENT = "spideraml:consent-open";

type Choice = "granted" | "denied" | null;
type Gtag = (...args: unknown[]) => void;

function readChoice(): Choice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null; // storage blocked: ask each time, load nothing
  }
}

/** Removes Google's cookies (_ga, _ga_XXXX) so a withdrawn consent leaves nothing behind. */
function clearGoogleCookies() {
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0].trim();
    if (name === "_ga" || name.startsWith("_ga_") || name === "_gid") {
      for (const domain of [location.hostname, `.${location.hostname}`, ""]) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ""}`;
      }
    }
  }
}

type Params = Record<string, string | number | boolean>;

/**
 * Sends an anonymous event to Google Analytics, only after consent. Parameters must never carry what the visitor typed
 * (addresses, search text): network, risk level, tool names and similar coarse values only.
 * gtag appears a moment after consent, so the call waits for it (up to ~5 s).
 */
export function sendGaEvent(name: string, params: Params = {}) {
  if (!GA_ID) return;
  try {
    if (localStorage.getItem(KEY) !== "granted") return;
  } catch {
    return;
  }
  let tries = 0;
  const poll = setInterval(() => {
    const gtag = (window as unknown as { gtag?: Gtag }).gtag;
    if (gtag) {
      clearInterval(poll);
      gtag("event", name, params);
    } else if (++tries > 50) clearInterval(poll);
  }, 100);
}

const lastFired = new Map<string, number>();

/** Fires one event when it appears on the page (a result was shown). Renders nothing. */
export function GaEvent({ name, params }: { name: string; params?: Params }) {
  const key = `${name}:${JSON.stringify(params ?? {})}`;
  useEffect(() => {
    // effects can run twice for one render (React strict mode, re-mounts): the same event within 2 s counts once
    const now = Date.now();
    if (now - (lastFired.get(key) ?? 0) < 2000) return;
    lastFired.set(key, now);
    sendGaEvent(name, params);
    // the key covers name and params; a re-render with the same values must not count twice
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

export function Analytics() {
  const t = useTranslations("Consent");
  const path = usePathname();
  const [choice, setChoice] = useState<Choice>(null);
  const [ready, setReady] = useState(false);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    const c = readChoice();
    setChoice(c);
    setAsking(c === null);
    setReady(true);
    const open = () => setAsking(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  // every page view, including single-page navigation. Waits for gtag (the script loads after consent) and for Next.js to
  // update the document title, so the view carries the right page name.
  useEffect(() => {
    if (choice !== "granted") return;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = setInterval(() => {
      const gtag = (window as unknown as { gtag?: Gtag }).gtag;
      if (!gtag) {
        if (++tries > 50) clearInterval(poll);
        return;
      }
      clearInterval(poll);
      timer = setTimeout(() => {
        // the path only: the query string carries the address being checked and must never reach Google
        const loc = location.origin + path;
        gtag("set", { page_location: loc, page_title: document.title });
        gtag("event", "page_view", { page_location: loc, page_path: path, page_title: document.title });
      }, 300);
    }, 100);
    return () => {
      clearInterval(poll);
      clearTimeout(timer);
    };
  }, [choice, path]);

  const decide = useCallback((c: Exclude<Choice, null>) => {
    try {
      localStorage.setItem(KEY, c);
    } catch {
      /* storage blocked: the choice lasts until the page is reloaded */
    }
    if (c === "denied") clearGoogleCookies();
    setChoice(c);
    setAsking(false);
  }, []);

  if (!GA_ID || !ready) return null;
  return (
    <>
      {choice === "granted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
            gtag('js', new Date());
            gtag('set', { page_location: location.origin + location.pathname });
            gtag('config', '${GA_ID}', { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
          `}</Script>
        </>
      )}
      {asking && (
        <div role="dialog" aria-label={t("title")} className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl border border-line bg-surface p-4 shadow-2xl sm:p-5">
          <p className="text-sm leading-relaxed text-silver-1">
            {t("text")}{" "}
            <Link href="/privacy" className="link">
              {t("more")}
            </Link>
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {/* equal weight: declining must be as easy as accepting */}
            <button type="button" onClick={() => decide("denied")} className="btn-ghost h-10 flex-1 text-sm">
              {t("decline")}
            </button>
            <button type="button" onClick={() => decide("granted")} className="btn-ghost h-10 flex-1 text-sm">
              {t("accept")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Footer button that reopens the question. Rendered only when analytics is configured. */
export function ConsentSettings() {
  const t = useTranslations("Consent");
  if (!GA_ID) return null;
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} className="hover:text-silver-1">
      {t("settings")}
    </button>
  );
}
