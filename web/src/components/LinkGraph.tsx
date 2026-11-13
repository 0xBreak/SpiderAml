// "Linked addresses": the flagged addresses this address has exchanged transfers with (history built offline), laid out as the way the money went:
// received from (left) → this address → sent to (right); stacked on a phone. Plain HTML: it needs no script and reads the same on every screen.
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowDown, ArrowRight, ExternalLink } from "lucide-react";
import { Badge, Card, Notice, toneOfSeverity } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { CheckLink } from "@/lib/api-types";
import { cn, date, short } from "@/lib/format";
import { NETWORKS } from "@/lib/networks";

const SHOWN = 8; // links per column; the rest is counted below

const stripe = (severity: number, victim: boolean) => (victim ? "border-l-silver-3" : severity >= 3 ? "border-l-crit" : severity === 2 ? "border-l-warn" : "border-l-silver-3");
const bar = (severity: number, victim: boolean) => (victim ? "bg-silver-3" : severity >= 3 ? "bg-crit" : severity === 2 ? "bg-warn" : "bg-silver-3");
/**
 * The checked address sent money to a phishing, scam or frozen address: far more often a victim or an ordinary payment than a culprit (most flagged addresses
 * a random wallet touches are of this kind), so the link is drawn neutral. Money sent to a sanctioned, exploit or mixer address, and anything received from a
 * flagged address, keeps its colour.
 */
const isVictimLink = (l: CheckLink) => l.direction === "out" && (l.category === "phishing" || l.category === "scam" || l.category === "frozen");

export async function LinkGraph({ links, network, address, explorer, service = false }: { links: CheckLink[]; network: string; address: string; explorer: string | null; service?: boolean }) {
  const t = await getTranslations("Links");
  const tCat = await getTranslations("Category");
  const locale = (await getLocale()) as Locale;
  const networkName = network === "tron" ? "Tron" : network === "bitcoin" ? "Bitcoin" : (NETWORKS as Record<string, { label: string }>)[network]?.label ?? network;
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const assetText = (l: CheckLink) => l.assets.slice(0, 3).map((a) => (a.amount != null ? `${nf.format(a.amount)} ${a.symbol}` : a.symbol)).join(" · ");
  const anyVictim = links.some(isVictimLink);
  const incoming = links.filter((l) => l.direction === "in");
  const outgoing = links.filter((l) => l.direction === "out");

  const Column = ({ title, items }: { title: string; items: CheckLink[] }) => {
    const maxTx = Math.max(1, ...items.map((l) => l.txCount));
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-silver-3">{title}</div>
        {items.length === 0 && <div className="border border-dashed border-line/60 px-3 py-4 text-sm text-silver-3">{t("colEmpty")}</div>}
        {items.slice(0, SHOWN).map((l) => {
          const victim = isVictimLink(l);
          const indirect = l.source === "hop2-indirect";
          return (
            <div key={`${l.address}-${l.direction}`} className={cn("flex min-w-0 flex-col gap-1 border border-line/50 border-l-4 bg-white/[0.02] px-3 py-2.5", stripe(l.severity, victim))}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link href={`/check?address=${l.address}&network=${network}`} className="font-mono text-sm text-silver-1 hover:underline">
                  {short(l.address)}
                </Link>
                {explorer && (
                  <a href={`${explorer}/address/${l.address}`} target="_blank" rel="noopener noreferrer" className="text-silver-3 hover:text-silver-1" aria-label={t("explorer")}>
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
                {!indirect && <Badge tone={victim ? "muted" : toneOfSeverity(l.severity)}>{tCat.has(l.category) ? tCat(`${l.category}.name`) : l.category}</Badge>}
              </div>
              {assetText(l) && <div className="text-base font-medium text-silver-1">{assetText(l)}</div>}
              <div className="h-1 w-full bg-line/40" aria-hidden>
                <div className={cn("h-1", bar(l.severity, victim))} style={{ width: `${Math.max(12, Math.round((l.txCount / maxTx) * 100))}%` }} />
              </div>
              <div className="text-xs text-silver-3">
                {t("transfers", { count: l.txCount })} · {date(l.firstTs * 1000, locale)}
                {date(l.firstTs * 1000, locale) !== date(l.lastTs * 1000, locale) && <> — {date(l.lastTs * 1000, locale)}</>}
              </div>
              <div className="text-xs leading-snug text-silver-3" title={`${l.label} · ${l.sourceName}`}>
                {indirect ? t("indirectLine") : l.label}
              </div>
            </div>
          );
        })}
        {items.length > SHOWN && <div className="text-xs text-silver-3">{t("moreIn", { count: items.length - SHOWN })}</div>}
      </div>
    );
  };

  return (
    <Card title={t("title")} hint={network === "tron" || network === "bitcoin" ? t("hint", { network: networkName }) : t("hintEvm")}>
      <div role="group" aria-label={t("aria")} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-start">
        <Column title={t("colIn")} items={incoming} />
        <div className="flex flex-row items-center justify-center gap-2 py-1 md:self-center md:py-0">
          <ArrowDown className="size-5 text-silver-3 md:hidden" aria-hidden />
          <ArrowRight className="hidden size-5 shrink-0 text-silver-3 md:block" aria-hidden />
          <div className="border border-accent/60 bg-accent/15 px-3 py-2 text-center">
            <div className="text-xs text-silver-3">{t("centre")}</div>
            <div className="font-mono text-sm text-silver-1">{short(address)}</div>
          </div>
          <ArrowDown className="size-5 text-silver-3 md:hidden" aria-hidden />
          <ArrowRight className="hidden size-5 text-silver-3 md:block" aria-hidden />
        </div>
        <Column title={t("colOut")} items={outgoing} />
      </div>
      <p className="mt-3 text-sm text-silver-3">{t("legend")}</p>
      {anyVictim && <p className="mt-2 text-sm text-silver-3">{t("victimNote")}</p>}
      <div className="mt-4">
        <Notice>{t(service ? "serviceNote" : "inScore")}</Notice>
      </div>
    </Card>
  );
}
