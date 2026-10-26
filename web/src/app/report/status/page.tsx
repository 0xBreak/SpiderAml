import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, Search, XCircle } from "lucide-react";
import { Addr } from "@/components/Addr";
import { Card, ErrorBox, PageTitle } from "@/components/ui";
import { DataError, getReportStatus, limit, type ReportStatusInfo } from "@/lib/data";
import { dateTime } from "@/lib/format";
import { NETWORKS, isNetworkId } from "@/lib/networks";

export const metadata: Metadata = { title: "Статус заявки", robots: { index: false } };
export const dynamic = "force-dynamic";

type SP = Promise<{ id?: string; t?: string }>;

const STATUS: Record<ReportStatusInfo["status"], { title: string; text: string; icon: typeof Clock; tone: string }> = {
  new: { title: "Принята", text: "Заявка сохранена и ждёт проверки.", icon: Clock, tone: "text-accent" },
  reviewing: { title: "На проверке", text: "Мы разбираемся с доказательствами.", icon: Search, tone: "text-warn" },
  confirmed: { title: "Подтверждена", text: "Риск подтверждён: адрес добавлен в нашу базу и учитывается в AML-проверке.", icon: CheckCircle2, tone: "text-ok" },
  rejected: { title: "Отклонена", text: "Подтверждений не нашлось, адрес не добавлен.", icon: XCircle, tone: "text-silver-2" },
};

const CATEGORY: Record<string, string> = {
  phishing: "Фишинг или дрейнер",
  scam: "Обман или схема",
  exploit: "Взлом или кража",
  mixer: "Отмывание через миксер",
  sanctioned: "Связан с санкционным лицом",
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
      r = await getReportStatus(id, t);
    } catch (e) {
      error = e instanceof DataError ? e : new DataError("UPSTREAM", "", 500);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageTitle title={r ? `Заявка №${r.id}` : "Статус заявки"} />
      {!r && (
        <ErrorBox
          message={error?.status === 404 || !id || !t ? "Заявка не найдена. Проверьте ссылку — её выдают сразу после отправки заявки." : error?.message}
          code={error?.status === 404 ? undefined : error?.code}
        />
      )}
      {r && (
        <Card>
          {(() => {
            const s = STATUS[r.status];
            const Icon = s.icon;
            return (
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 size-6 shrink-0 ${s.tone}`} />
                <div>
                  <div className={`text-lg font-semibold ${s.tone}`}>{s.title}</div>
                  <p className="text-sm text-silver-2">{s.text}</p>
                </div>
              </div>
            );
          })()}
          {r.reply && (
            <div className="mt-4 rounded-md border border-line bg-bg/40 p-3 text-sm">
              <div className="label mb-1">Ответ SpiderAML</div>
              <p className="whitespace-pre-line text-silver-1">{r.reply}</p>
            </div>
          )}
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-silver-3">Адрес</dt>
            <dd className="min-w-0">
              <Addr value={r.address} full />
            </dd>
            <dt className="text-silver-3">Сеть</dt>
            <dd>{isNetworkId(r.network) ? NETWORKS[r.network].label : r.network === "tron" ? "Tron" : r.network}</dd>
            <dt className="text-silver-3">Что случилось</dt>
            <dd>{CATEGORY[r.category] ?? r.category}</dd>
            <dt className="text-silver-3">Отправлена</dt>
            <dd>{dateTime(r.createdAt)}</dd>
            {r.updatedAt && r.updatedAt !== r.createdAt && (
              <>
                <dt className="text-silver-3">Обновлена</dt>
                <dd>{dateTime(r.updatedAt)}</dd>
              </>
            )}
          </dl>
          <p className="mt-4 text-xs text-silver-3">Эта страница доступна только по вашей ссылке. Сохраните её, чтобы вернуться позже.</p>
        </Card>
      )}
      <Link href="/report" className="link text-sm">
        ← Сообщить о другом адресе
      </Link>
    </div>
  );
}
