import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Addr } from "@/components/Addr";
import { Card, Empty, ErrorBox, Notice, PageTitle } from "@/components/ui";
import type { SanctionsPage } from "@/lib/api-types";
import { DataError, getSanctions } from "@/lib/data";
import { trackEvent } from "@/lib/metrics";
import { date, dateTime } from "@/lib/format";
import { CHAIN_NAME } from "@/lib/texts";

export const metadata: Metadata = { title: "Санкционные адреса" };
export const dynamic = "force-dynamic";

type SP = Promise<{ q?: string; chain?: string; list?: string; page?: string }>;

const EXPLORER: Record<string, (a: string) => string> = {
  evm: (a) => `https://etherscan.io/address/${a}`,
  tron: (a) => `https://tronscan.org/#/address/${a}`,
  bitcoin: (a) => `https://mempool.space/address/${a}`,
};

export default async function Sanctions({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  let data: SanctionsPage | null = null;
  let error: DataError | null = null;
  try {
    data = await getSanctions({ q: sp.q?.slice(0, 100), chain: sp.chain, list: sp.list, page });
    if (sp.q || sp.chain || sp.list) trackEvent("sanctions_search", sp.q ? "query" : (sp.list ?? sp.chain ?? null), "/sanctions");
  } catch (e) {
    error = e instanceof DataError ? e : new DataError("UPSTREAM", "", 500);
  }

  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (sp.q) u.set("q", sp.q);
    if (sp.chain) u.set("chain", sp.chain);
    if (sp.list) u.set("list", sp.list);
    u.set("page", String(p));
    return `/sanctions?${u}`;
  };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-5">
      <PageTitle
        title="Санкционные адреса"
        sub="Криптоадреса из официальных санкционных списков США, Великобритании и Евросоюза. Только то, что опубликовали сами регуляторы, со ссылкой на запись в источнике. Наши собственные метки здесь не показываются — они учитываются в AML-проверке."
      />
      {error && <ErrorBox code={error.code} message={error.message} />}
      {data && (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            {data.sources.map((src) => {
              const n = src.count;
              return (
                <a key={src.id} href={src.url} target="_blank" rel="noopener noreferrer" className="card flex flex-col gap-1 p-3 transition hover:border-silver-3">
                  <span className="flex items-center gap-1 text-sm font-medium text-silver-1">
                    {src.name} <ExternalLink className="size-3 text-silver-3" />
                  </span>
                  <span className="text-xl font-semibold tabular-nums">{n.toLocaleString("ru-RU")}</span>
                  <span className="text-xs text-silver-3">{src.error ? "последнее обновление не удалось" : `обновлено ${dateTime(src.fetchedAt)}`}</span>
                </a>
              );
            })}
          </div>

          <form method="get" action="/sanctions" className="flex flex-col gap-2 sm:flex-row" role="search">
            <input name="q" defaultValue={sp.q} maxLength={100} placeholder="Адрес или имя из списка" className="input font-mono sm:flex-1" aria-label="Поиск" />
            <select name="chain" defaultValue={sp.chain ?? ""} className="input sm:w-48" aria-label="Сеть">
              <option value="">Все сети</option>
              {data.chains.map((c) => (
                <option key={c.chain} value={c.chain}>
                  {CHAIN_NAME[c.chain] ?? c.chain} ({c.count})
                </option>
              ))}
            </select>
            <select name="list" defaultValue={sp.list ?? ""} className="input sm:w-48" aria-label="Список">
              <option value="">Все списки</option>
              {data.lists.map((l) => (
                <option key={l.list} value={l.list}>
                  {l.list} ({l.count})
                </option>
              ))}
            </select>
            <button className="btn-primary">Найти</button>
          </form>

          <Notice>Адрес в EVM-сетях (Ethereum, BNB Chain, Arbitrum и др.) один и тот же во всех этих сетях, поэтому они показаны вместе.</Notice>

          <Card title={`Найдено: ${data.total.toLocaleString("ru-RU")}`}>
            {data.items.length === 0 ? (
              <Empty>Ничего не найдено. Попробуйте изменить запрос или фильтры.</Empty>
            ) : (
              <>
              <ul className="divide-y divide-line/60 md:hidden">
                {data.items.map((s) => (
                  <li key={s.address + s.list} className="space-y-1 py-3 text-sm">
                    <div className="font-medium text-silver-1">{s.name}</div>
                    <Addr value={s.address} href={EXPLORER[s.chain]?.(s.address)} />
                    <div className="text-silver-3">
                      {CHAIN_NAME[s.chain] ?? s.chain} · {s.asset} ·{" "}
                      <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="link">
                        {s.list}
                      </a>
                      {s.listedAt && <> · с {date(s.listedAt)}</>}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
                <table className="table min-w-[760px]">
                  <thead>
                    <tr>
                      <th>Адрес</th>
                      <th>Сеть</th>
                      <th>Кому принадлежит</th>
                      <th>Список</th>
                      <th>Дата включения</th>
                      <th>Проверено</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((s) => (
                      <tr key={s.address + s.list}>
                        <td>
                          <Addr value={s.address} href={EXPLORER[s.chain]?.(s.address)} />
                        </td>
                        <td className="whitespace-nowrap text-silver-2">
                          {CHAIN_NAME[s.chain] ?? s.chain} <span className="text-silver-3">· {s.asset}</span>
                        </td>
                        <td className="text-silver-1">
                          {s.name}
                          {s.program && <div className="text-xs text-silver-3">{s.program}</div>}
                        </td>
                        <td className="whitespace-nowrap">
                          <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
                            {s.list} <ExternalLink className="size-3" />
                          </a>
                        </td>
                        <td className="whitespace-nowrap text-silver-2">{s.listedAt ? date(s.listedAt) : <span className="text-silver-3">не указана</span>}</td>
                        <td className="whitespace-nowrap text-silver-2">{date(s.checkedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
            {pages > 1 && (
              <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Страницы">
                {page > 1 ? (
                  <Link href={qs(page - 1)} className="btn-ghost h-9">
                    ← Назад
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-silver-3">
                  Страница {page} из {pages}
                </span>
                {page < pages ? (
                  <Link href={qs(page + 1)} className="btn-ghost h-9">
                    Дальше →
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </Card>
          <p className="text-xs text-silver-3">
            Великобритания и ЕС публикуют дату включения в список. OFAC (США) её в машиночитаемом списке не даёт — она есть на странице записи по ссылке. «Проверено» — когда мы последний раз сверили адрес с источником.
          </p>
        </>
      )}
    </div>
  );
}
