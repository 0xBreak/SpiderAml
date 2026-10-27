import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { FlowBucket } from "@/lib/types";
import { usd } from "@/lib/format";

const hhmm = (t: number, locale: Locale) => new Date(t * 1000).toLocaleTimeString(locale === "en" ? "en-GB" : "ru-RU", { hour: "2-digit", minute: "2-digit" });

/** Buy vs sell volume per hour, drawn as CSS bars (no client chart lib, always renders). */
export function FlowChart({ buckets }: { buckets: FlowBucket[] }) {
  const t = useTranslations("Ui");
  const locale = useLocale() as Locale;
  if (buckets.length === 0) return null;
  const max = Math.max(...buckets.map((b) => Math.max(b.buyUsd ?? 0, b.sellUsd ?? 0)), 1);

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-sm text-silver-2">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 bg-ok" aria-hidden /> {t("buys")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 bg-crit" aria-hidden /> {t("sells")}
        </span>
      </div>
      <div className="flex h-52 items-stretch gap-[3px]" role="img" aria-label={t("flowLabel")}>
        {buckets.map((b) => {
          const buy = ((b.buyUsd ?? 0) / max) * 100;
          const sell = ((b.sellUsd ?? 0) / max) * 100;
          const label = t("flowTip", { time: hhmm(b.t, locale), buy: usd(b.buyUsd, true, locale), sell: usd(b.sellUsd, true, locale) });
          return (
            <div key={b.t} className="flex min-w-0 flex-1 flex-col justify-center" title={label}>
              <div className="flex flex-1 items-end">
                <div className="w-full bg-ok/80" style={{ height: `${buy}%` }} />
              </div>
              <div className="h-px w-full bg-line" aria-hidden />
              <div className="flex flex-1 items-start">
                <div className="w-full bg-crit/80" style={{ height: `${sell}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-sm text-silver-2">
        <span>{hhmm(buckets[0].t, locale)}</span>
        <span>{hhmm(buckets[buckets.length - 1].t, locale)}</span>
      </div>
    </div>
  );
}
