"use client";

import { useEffect } from "react";

/** Sends a beacon for clicks on elements marked data-track="label" and on links leaving the site. */
export function ClickTracker() {
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
      const body = JSON.stringify({ label, path: location.pathname });
      if (!navigator.sendBeacon?.("/api/e", new Blob([body], { type: "application/json" })))
        fetch("/api/e", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
