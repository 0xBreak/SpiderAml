"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

interface Props {
  total: number;
  last24h: number;
  series: { day: string; n: number }[];
  locale: string;
  labels: { title: string; kinds: string; today: string; since: string | null; chart: string; chartToday: string };
}

/**
 * One public number: how many requests the service has answered (address checks, token analyses, whales, sanctions searches).
 * The server renders the final number (works without JavaScript, readable by crawlers); in the browser it counts up,
 * unless the visitor asked for reduced motion, and an open tab refreshes it for 10 minutes.
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

  // an open tab keeps up, but only for its first 10 minutes (a forgotten tab must not load the server for ever), only while it is
  // visible, and at 40-60 seconds with a random spread so that tabs do not all ask at the same moment. No JSON API: the server component is rendered again.
  useEffect(() => {
    const until = Date.now() + 10 * 60_000;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      if (Date.now() >= until) return;
      timer = setTimeout(() => {
        if (document.visibilityState === "visible") router.refresh();
        next();
      }, 40_000 + Math.random() * 20_000);
    };
    next();
    return () => clearTimeout(timer);
  }, [router]);

  // the chart: a line with a soft fill, straight segments like the rest of the site (square corners, no curves)
  const W = 640;
  const H = 96;
  const PAD = 10;
  const n = series.length;
  const max = Math.max(1, ...series.map((d) => d.n));
  const pts = series.map((d, i) => [n < 2 ? W / 2 : (i * W) / (n - 1), H - PAD - (d.n / max) * (H - PAD * 2)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const short = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short" });
  const last = pts[pts.length - 1];

  return (
    <div className="relative mx-auto max-w-2xl px-2 text-center">
      {/* a soft glow behind the number: the same teal as the accents of the page */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-10 h-56 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--color-ok)_14%,transparent),transparent_68%)]" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-silver-2">
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inline-flex size-full rounded-full bg-ok/60 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-ok" />
          </span>
          {labels.title}
        </div>
        <div className="mt-3 text-6xl font-semibold leading-none tracking-tight tabular-nums text-silver-1 sm:text-7xl" aria-label={`${labels.title}: ${fmt.format(total)}`}>
          {fmt.format(shown)}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
          {last24h > 0 && (
            <span className="inline-flex items-center gap-1 text-ok">
              <ArrowUp className="size-3.5" aria-hidden />
              {labels.today}
            </span>
          )}
          {labels.since && <span className="text-silver-2">{labels.since}</span>}
        </div>

        {n > 1 && (
          <figure className="mt-7">
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={labels.chart} className="h-auto w-full overflow-visible">
              <defs>
                <linearGradient id="rc-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-ok)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--color-ok)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} stroke="var(--color-line)" />
              <path d={area} fill="url(#rc-fill)" />
              <path d={line} fill="none" stroke="var(--color-ok)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              {pts.map(([x, y], i) => (
                <g key={series[i].day}>
                  <rect x={x - W / (2 * (n - 1))} y={0} width={W / (n - 1)} height={H} fill="transparent">
                    <title>{`${short.format(Date.parse(series[i].day))}: ${fmt.format(series[i].n)}`}</title>
                  </rect>
                  {i === n - 1 && (
                    <>
                      <circle cx={x} cy={y} r="9" fill="var(--color-ok)" opacity="0.18" />
                      <circle cx={x} cy={y} r="4" fill="var(--color-ok)" />
                    </>
                  )}
                </g>
              ))}
            </svg>
            <figcaption className="mt-2 flex justify-between text-xs text-silver-3">
              <span>{short.format(Date.parse(series[0].day))}</span>
              <span>{labels.chartToday}</span>
            </figcaption>
          </figure>
        )}
        <p className="mx-auto mt-5 max-w-md text-sm text-silver-3">{labels.kinds}</p>
      </div>
    </div>
  );
}
