// "Linked addresses": a picture and a list of the flagged addresses this address has exchanged transfers with (history of
// the Ethereum blockchain, built offline). Drawn on the server as plain SVG, so it needs no script and reads the same on a phone.
import { getLocale, getTranslations } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import { Badge, Card, Notice, toneOfSeverity } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { CheckLink } from "@/lib/api-types";
import { cn, date, short } from "@/lib/format";
import { ringLayout, strokeOf, trim } from "@/lib/graph";

const SHOWN = 16; // nodes on the picture; the list below has all of them
const W = 640;
const H = 420;
const R_CENTER = 30;
const R_NODE = 18;

const fill = (severity: number) => (severity >= 3 ? "fill-crit" : severity === 2 ? "fill-warn" : "fill-silver-3");
const stroke = (severity: number) => (severity >= 3 ? "stroke-crit" : severity === 2 ? "stroke-warn" : "stroke-silver-3");
/**
 * The checked address sent money to a phishing, scam or frozen address: far more often a victim or an ordinary payment than a
 * culprit (most flagged addresses a random wallet touches are of this kind), so the link is drawn neutral. Money sent to a
 * sanctioned, exploit or mixer address, and anything received from a flagged address, keeps its colour.
 */
/** "Tornado.Cash: 10 ETH (OFAC sanctions)" → "Tornado.Cash: 10 ETH"; long names are cut. */
const shortName = (label: string) => {
  const base = label.split(" (")[0].trim();
  return base.length > 22 ? `${base.slice(0, 21)}…` : base;
};
const isVictimLink = (l: CheckLink) => l.direction === "out" && (l.category === "phishing" || l.category === "scam" || l.category === "frozen");

export async function LinkGraph({ links, network, explorer, service = false }: { links: CheckLink[]; network: string; explorer: string | null; service?: boolean }) {
  const t = await getTranslations("Links");
  const tCat = await getTranslations("Category");
  const locale = (await getLocale()) as Locale;
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const shown = links.slice(0, SHOWN);
  const pts = ringLayout(shown.length, W, H);
  const centre = { x: W / 2, y: H / 2 };
  const anyVictim = links.some(isVictimLink);
  /** where the name goes: on the far side of the node from the centre */
  const label = (p: { x: number; y: number }) => {
    const vx = p.x - centre.x, vy = p.y - centre.y;
    const len = Math.hypot(vx, vy) || 1;
    const ux = vx / len, uy = vy / len;
    const anchor = ux > 0.35 ? "start" : ux < -0.35 ? "end" : "middle";
    return { dx: ux * (R_NODE + 8) + (anchor === "start" ? 4 : anchor === "end" ? -4 : 0), dy: uy * (R_NODE + 10) + (uy > 0 ? 6 : 0), anchor: anchor as "start" | "end" | "middle" };
  };

  const assetText = (l: CheckLink) =>
    l.assets
      .slice(0, 3)
      .map((a) => (a.amount != null ? `${nf.format(a.amount)} ${a.symbol}` : a.symbol))
      .join(" · ");

  return (
    <Card title={t("title")} hint={t("hint")}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("aria")} className="mx-auto h-auto w-full max-w-[640px]">
        <defs>
          {[["crit", "var(--color-crit)"], ["warn", "var(--color-warn)"], ["muted", "var(--color-silver-3)"]].map(([id, color]) => (
            <marker key={id} id={`arrow-${id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill={color} />
            </marker>
          ))}
        </defs>
        {shown.map((l, i) => {
          const victim = isVictimLink(l);
          const tone = victim ? "muted" : l.severity >= 3 ? "crit" : l.severity === 2 ? "warn" : "muted";
          // 'in': the checked address received from the other one, so the arrow points at the centre
          const [from, to] = l.direction === "in" ? [pts[i], centre] : [centre, pts[i]];
          const [p, q] = trim(from, to, from === centre ? R_CENTER : R_NODE, to === centre ? R_CENTER + 4 : R_NODE + 4);
          return (
            <line
              key={`${l.address}-${l.direction}`}
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              strokeWidth={strokeOf(l.txCount)}
              strokeDasharray={victim ? "5 4" : undefined}
              strokeOpacity={0.85}
              markerEnd={`url(#arrow-${tone})`}
              className={victim ? "stroke-silver-3" : stroke(l.severity)}
            />
          );
        })}
        <circle cx={centre.x} cy={centre.y} r={R_CENTER} className="fill-accent stroke-accent-from" strokeWidth={2} />
        <text x={centre.x} y={centre.y + 5} textAnchor="middle" className="fill-silver-1 text-[15px] font-semibold">
          {t("centre")}
        </text>
        {shown.map((l, i) => (
          <g key={`${l.address}-n-${l.direction}`}>
            <title>{`${l.address}\n${l.label}`}</title>
            <circle cx={pts[i].x} cy={pts[i].y} r={R_NODE} className={cn(fill(l.severity), "stroke-bg")} strokeWidth={2} />
            <text x={pts[i].x} y={pts[i].y + 6} textAnchor="middle" className="fill-bg text-[18px] font-bold">
              {i + 1}
            </text>
            {/* a short name outside the node, away from the centre so it never sits on the arrow */}
            <text
              x={pts[i].x + label(pts[i]).dx}
              y={pts[i].y + label(pts[i]).dy}
              textAnchor={label(pts[i]).anchor}
              className="fill-silver-2 text-[11px]"
            >
              {shortName(l.label)}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-2 text-center text-sm text-silver-3">{t("legend")}</p>

      <ol className="mt-5 flex flex-col divide-y divide-line/40">
        {links.map((l, i) => (
          <li key={`${l.address}-${l.direction}`} className="flex flex-col gap-1.5 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("flex size-6 shrink-0 items-center justify-center text-xs font-bold text-bg", i < SHOWN ? fill(l.severity).replace("fill-", "bg-") : "bg-silver-3")} aria-hidden>
                {i + 1}
              </span>
              <Badge tone={isVictimLink(l) ? "muted" : toneOfSeverity(l.severity)}>{tCat.has(l.category) ? tCat(`${l.category}.name`) : l.category}</Badge>
              <Link href={`/check?address=${l.address}&network=${network}`} className="font-mono text-sm text-silver-1 hover:underline">
                {short(l.address)}
              </Link>
              {explorer && (
                <a href={`${explorer}/address/${l.address}`} target="_blank" rel="noopener noreferrer" className="p-1 text-silver-3 hover:text-silver-1" aria-label={t("explorer")}>
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
            <div className="text-base leading-snug text-silver-1">
              {l.direction === "in" ? t("received") : t("sent")}
              {assetText(l) && <span className="text-silver-2">: {assetText(l)}</span>}
            </div>
            <div className="text-sm text-silver-2">
              {t("transfers", { count: l.txCount })} · {date(l.firstTs * 1000, locale)} — {date(l.lastTs * 1000, locale)}
            </div>
            <div className="text-sm text-silver-3">
              {l.label} · {t("source")}: {l.sourceName}
            </div>
          </li>
        ))}
      </ol>
      {links.length > SHOWN && <p className="mt-3 text-sm text-silver-3">{t("more", { shown: SHOWN, count: links.length - SHOWN })}</p>}
      {anyVictim && <p className="mt-3 text-sm text-silver-3">{t("victimNote")}</p>}
      <div className="mt-4">
        <Notice>{t(service ? "serviceNote" : "inScore")}</Notice>
      </div>
    </Card>
  );
}
