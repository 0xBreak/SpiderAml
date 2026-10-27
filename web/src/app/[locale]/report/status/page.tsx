import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CheckCircle2, Clock, Search, XCircle } from "lucide-react";
import { Addr } from "@/components/Addr";
import { Card, ErrorBox, PageTitle } from "@/components/ui";
import { DataError, getReportStatus, limit, type ReportStatusInfo } from "@/lib/data";
import { dateTime } from "@/lib/format";
import type { Locale } from "@/i18n/routing";
import { NETWORKS, isNetworkId } from "@/lib/networks";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ReportStatus");
  return { title: t("title"), robots: { index: false } };
}
export const dynamic = "force-dynamic";

type SP = Promise<{ id?: string; t?: string }>;

const LOOK: Record<ReportStatusInfo["status"], { icon: typeof Clock; tone: string }> = {
  new: { icon: Clock, tone: "text-accent-from" },
  reviewing: { icon: Search, tone: "text-warn" },
  confirmed: { icon: CheckCircle2, tone: "text-ok" },
  rejected: { icon: XCircle, tone: "text-silver-2" },
};

export default async function ReportStatusPage({ searchParams }: { searchParams: SP }) {
  const { id, t: token } = await searchParams;
  const t = await getTranslations("ReportStatus");
  const locale = (await getLocale()) as Locale;
  let r: ReportStatusInfo | null = null;
  let error: DataError | null = null;
  if (id && token) {
    try {
      await limit("report-status", 30);
      const found = await getReportStatus(id, token);
      if (!found || !Number.isFinite(found.id) || !found.address || !(found.status in LOOK)) {
        error = new DataError("NOT_FOUND", "", 404);
      } else {
        r = found;
      }
    } catch (e) {
      error = e instanceof DataError ? e : new DataError("UPSTREAM", "", 500);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageTitle title={r ? t("report", { id: r.id }) : t("title")} />
      {!r && (
        <ErrorBox
          message={error?.status === 404 || !id || !token ? t("notFound") : error?.message}
          code={error?.status === 404 ? undefined : error?.code}
        />
      )}
      {r && (
        <Card className="text-base">
          {(() => {
            const status = LOOK[r.status] ? r.status : "new";
            // a "flagged by mistake" report we accepted means the flag was removed, not that a risk was confirmed
            const fixed = status === "confirmed" && r.category === "false_positive";
            const s = { ...LOOK[status], title: t(fixed ? "fixed" : status), text: t(fixed ? "fixedText" : `${status}Text`) };
            const Icon = s.icon;
            return (
              <div className="flex items-start gap-4">
                <Icon className={cn("mt-1 size-8 shrink-0", s.tone)} />
                <div className="space-y-1">
                  <div className={cn("text-2xl font-semibold tracking-tight sm:text-3xl", s.tone)}>{s.title}</div>
                  <p className="text-silver-2">{s.text}</p>
                </div>
              </div>
            );
          })()}
          {r.reply && (
            <div className="mt-6 border-l-2 border-accent pl-4">
              <div className="text-sm text-silver-2">{t("reply")}</div>
              <p className="mt-1 whitespace-pre-line text-silver-1">{r.reply}</p>
            </div>
          )}
          <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-sm text-silver-2">{t("address")}</dt>
              <dd className="mt-1 min-w-0">
                <Addr value={r.address} full className="text-base" />
              </dd>
            </div>
            <div>
              <dt className="text-sm text-silver-2">{t("network")}</dt>
              <dd className="mt-1 text-silver-1">{isNetworkId(r.network) ? NETWORKS[r.network].label : r.network === "tron" ? "Tron" : r.network}</dd>
            </div>
            <div>
              <dt className="text-sm text-silver-2">{t("what")}</dt>
              <dd className="mt-1 text-silver-1">{t.has(`cat_${r.category}`) ? t(`cat_${r.category}`) : r.category}</dd>
            </div>
            <div>
              <dt className="text-sm text-silver-2">{t("sent")}</dt>
              <dd className="mt-1 text-silver-1">{dateTime(r.createdAt, locale)}</dd>
            </div>
            {r.updatedAt && r.updatedAt !== r.createdAt && (
              <div>
                <dt className="text-sm text-silver-2">{t("updated")}</dt>
                <dd className="mt-1 text-silver-1">{dateTime(r.updatedAt, locale)}</dd>
              </div>
            )}
          </dl>
          <p className="mt-6 text-sm text-silver-2">{t("privateNote")}</p>
        </Card>
      )}
      <Link href="/report" className="link inline-block text-base">
        {t("another")}
      </Link>
    </div>
  );
}
