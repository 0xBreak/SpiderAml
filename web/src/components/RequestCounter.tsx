"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

interface Props {
  total: number;
  last24h: number;
  series: { day: string; n: number }[];
  locale: string;
  labels: { title: string; kinds: string; today: string; since: string | null; chart: string; chartCaption: string };
}

/**
 * One public number: how many requests the service has answered (address checks, token analyses, whales, sanctions searches).
 * The server renders the final number (works without JavaScript, readable by crawlers); in the browser it counts up,
 * unless the visitor asked for reduced motion, and an open tab refreshes it for 15 minutes.
 */
export function RequestCounter({ total, last24h, series, locale, labels }: Props) {
  const fmt = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US");
  const [shown, setShown] = useState(total);
  const shownRef = useRef(total);
  const first = useRef(true);
  const router = useRouter();

  // the number counts up to its value: from 85% of it when the page opens, from the previous value when a newer one arrives
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wasFirst = first.current;
    first.current = false;
    const from = wasFirst ? Math.floor(total * 0.85) : shownRef.current;
    if (reduced || total < 20 || from === total) {
      shownRef.current = total;
      setShown(total);
      return;
    }
    const start = performance.now();
    const duration = wasFirst ? 1100 : 700;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const value = Math.round(from + (total - from) * (1 - Math.pow(1 - t, 3)));
      shownRef.current = value;
      setShown(value);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total]);

  // an open tab keeps up, but only for its first 15 minutes (a forgotten tab must not load the server for ever), only while it is
  // visible, and at 20-35 seconds with a random spread so that tabs do not all ask at the same moment. No JSON API: the server component is rendered again.
  useEffect(() => {
    const until = Date.now() + 15 * 60_000;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      if (Date.now() >= until) return;
      timer = setTimeout(() => {
        if (document.visibilityState === "visible") router.refresh();
        next();
      }, 20_000 + Math.random() * 15_000);
    };
    next();
    return () => clearTimeout(timer);
  }, [router]);

  const max = Math.max(1, ...series.map((d) => d.n));
  const W = 224;
  const H = 56;
  const gap = 4;
  const bw = (W - gap * (series.length - 1)) / series.length;

  return (
    <div className="card mx-auto flex max-w-3xl flex-col gap-6 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm text-silver-2">
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inline-flex size-full rounded-full bg-ok/60 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-ok" />
          </span>
          {labels.title}
        </div>
        <div className="mt-1 text-5xl font-semibold leading-none tracking-tight tabular-nums text-silver-1 sm:text-6xl" aria-label={`${labels.title}: ${fmt.format(total)}`}>
          {fmt.format(shown)}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {last24h > 0 && (
            <span className="inline-flex items-center gap-1 text-ok">
              <ArrowUp className="size-3.5" aria-hidden />
              {labels.today}
            </span>
          )}
          {labels.since && <span className="text-silver-2">{labels.since}</span>}
        </div>
        <p className="mt-1 max-w-sm text-sm text-silver-3">{labels.kinds}</p>
      </div>
      <figure className="shrink-0 sm:w-56">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={labels.chart} className="h-14 w-full overflow-visible">
          {series.map((d, i) => {
            const h = d.n === 0 ? 2 : Math.max(4, (d.n / max) * (H - 2));
            const last = i === series.length - 1;
            return (
              <rect key={d.day} x={i * (bw + gap)} y={H - h} width={bw} height={h} rx={1} className={last ? "fill-ok" : d.n === 0 ? "fill-line" : "fill-accent/80"}>
                <title>{`${d.day}: ${fmt.format(d.n)}`}</title>
              </rect>
            );
          })}
        </svg>
        <figcaption className="mt-1.5 text-xs text-silver-3">{labels.chartCaption}</figcaption>
      </figure>
    </div>
  );
}
