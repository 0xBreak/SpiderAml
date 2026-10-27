import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { CheckCircle2, Clock, Search, XCircle } from "lucide-react";
import { Addr } from "@/components/Addr";
import { Card, ErrorBox, PageTitle } from "@/components/ui";
import { DataError, getReportStatus, limit, type ReportStatusInfo } from "@/lib/data";
import { dateTime } from "@/lib/format";
import { NETWORKS, isNetworkId } from "@/lib/networks";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Статус заявки", robots: { index: false } };
export const dynamic = "force-dynamic";

type SP = Promise<{ id?: string; t?: string }>;

const STATUS: Record<ReportStatusInfo["status"], { title: string; text: string; icon: typeof Clock; tone: string }> = {
  new: { title: "Принята", text: "Ждёт проверки.", icon: Clock, tone: "text-accent-from" },
  reviewing: { title: "На проверке", text: "Разбираем доказательства.", icon: Search, tone: "text-warn" },
  confirmed: { title: "Подтверждена", text: "Адрес добавлен в базу.", icon: CheckCircle2, tone: "text-ok" },
  rejected: { title: "Отклонена", text: "Доказательств не хватило.", icon: XCircle, tone: "text-silver-2" },
};

const CATEGORY: Record<string, string> = {
  phishing: "Фишинг или дрейнер",
  scam: "Обман или схема",
  exploit: "Взлом или кража",
  mixer: "Отмывание через миксер",
  sanctioned: "Связь с санкциями",
  other: "Другое",
  false_positive: "Ошибочная пометка",
};

export default async function ReportStatusPage({ searchParams }: { searchParams: SP }) {
  const { id, t } = await searchParams;
  let r: ReportStatusInfo | null = null;
  let error: DataError | null = null;
  if (id && t) {
    try {
      await limit("report-status", 30);
      const found = await getReportStatus(id, t);
      if (!found || !Number.isFinite(found.id) || !found.address || !(found.status in STATUS)) {
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
      <PageTitle title={r ? `Заявка №${r.id}` : "Статус заявки"} />
      {!r && (
        <ErrorBox
          message={error?.status === 404 || !id || !t ? "Заявка не найдена. Ссылка показывается один раз после отправки." : error?.message}
          code={error?.status === 404 ? undefined : error?.code}
        />
      )}
      {r && (
        <Card className="text-base">
          {(() => {
            const s = STATUS[r.status] ?? STATUS.new;
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
              <div className="text-sm text-silver-2">Ответ SpiderAML</div>
              <p className="mt-1 whitespace-pre-line text-silver-1">{r.reply}</p>
            </div>
          )}
          <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-sm text-silver-2">Адрес</dt>
              <dd className="mt-1 min-w-0">
                <Addr value={r.address} full className="text-base" />
              </dd>
            </div>
            <div>
              <dt className="text-sm text-silver-2">Сеть</dt>
              <dd className="mt-1 text-silver-1">{isNetworkId(r.network) ? NETWORKS[r.network].label : r.network === "tron" ? "Tron" : r.network}</dd>
            </div>
            <div>
              <dt className="text-sm text-silver-2">Что случилось</dt>
              <dd className="mt-1 text-silver-1">{CATEGORY[r.category] ?? r.category}</dd>
            </div>
            <div>
              <dt className="text-sm text-silver-2">Отправлена</dt>
              <dd className="mt-1 text-silver-1">{dateTime(r.createdAt)}</dd>
            </div>
            {r.updatedAt && r.updatedAt !== r.createdAt && (
              <div>
                <dt className="text-sm text-silver-2">Обновлена</dt>
                <dd className="mt-1 text-silver-1">{dateTime(r.updatedAt)}</dd>
              </div>
            )}
          </dl>
          <p className="mt-6 text-sm text-silver-2">Ссылка личная. Сохраните её.</p>
        </Card>
      )}
      <Link href="/report" className="link inline-block text-base">
        Сообщить о другом адресе
      </Link>
    </div>
  );
}
