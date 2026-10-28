"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { sendGaEvent } from "./Analytics";

const send = (body: string) => {
  if (!navigator.sendBeacon?.("/api/e", new Blob([body], { type: "application/json" })))
    fetch("/api/e", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
};

/** Where the visit came from, sent with the first page only: a ?src= / utm_source label beats the browser's referrer. */
function origin() {
  const q = new URLSearchParams(location.search);
  return { src: q.get("src") ?? q.get("utm_source") ?? q.get("ref"), ref: document.referrer || null };
}

let firstSent = false;

/**
 * Counts page views and clicks. A view is reported only when JavaScript runs in a visible tab and the browser is not
 * driven by automation: robots that pretend to be browsers are left out (the proxy records them as probes).
 * Clicks: elements marked data-track="label" and links leaving the site.
 */
export function ClickTracker() {
  const path = usePathname();

  useEffect(() => {
    if (navigator.webdriver) return;
    const report = () => {
      send(JSON.stringify({ nav: path, ...(firstSent ? {} : origin()) }));
      firstSent = true;
    };
    // a tab opened in the background (or prerendered) is counted when it is actually shown
    if (document.visibilityState === "visible") return void report();
    const onShow = () => document.visibilityState === "visible" && (document.removeEventListener("visibilitychange", onShow), report());
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [path]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-track], a[href^='http']");
      if (!el) return;
      let label = el.dataset.track;
      if (!label && el instanceof HTMLAnchorElement) {
        try {
          const host = new URL(el.href).hostname;
          if (host === location.hostname) return;
          label = `out:${host}`;
        } catch {
          return;
        }
      }
      if (!label) return;
      send(JSON.stringify({ label, path: location.pathname }));
      // our own labelled buttons only (links to other sites are measured by Google itself)
      if (el.dataset.track) sendGaEvent("ui_click", { label: el.dataset.track.slice(0, 80) });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
