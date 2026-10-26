import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Addr } from "@/components/Addr";
import { Card, Empty, ErrorBox, Notice, PageTitle } from "@/components/ui";
import type { SanctionsPage } from "@/lib/api-types";
import { DataError, getSanctions } from "@/lib/data";
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
        sub="Криптоадреса из официальных санкционных списков. Только то, что опубликовали сами регуляторы, со ссылкой на запись в источнике."
      />
      {error && <ErrorBox code={error.code} message={error.message} />}
      {data && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-silver-2">
            <span>
              Обновлено: <b className="text-silver-1">{dateTime(data.updatedAt)}</b>
            </span>
            {data.sources.map((s) => (
              <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
                {s.name} <ExternalLink className="size-3" />
              </a>
            ))}
          </div>

          <form method="get" action="/sanctions" className="flex flex-col gap-2 sm:flex-row" role="search">
            <input name="q" defaultValue={sp.q} maxLength={100} placeholder="Адрес или имя из списка" className="input flex-1 font-mono" aria-label="Поиск" />
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
              <div className="-mx-4 overflow-x-auto sm:mx-0">
                <table className="table min-w-[760px]">
                  <thead>
                    <tr>
                      <th>Адрес</th>
                      <th>Сеть</th>
                      <th>Кому принадлежит</th>
                      <th>Список</th>
                      <th>В нашей базе с</th>
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
                        <td className="whitespace-nowrap text-silver-2">{date(s.firstSeen)}</td>
                        <td className="whitespace-nowrap text-silver-2">{date(s.checkedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
            OFAC не публикует дату внесения для каждого адреса, поэтому «В нашей базе с» — дата, когда адрес впервые появился в нашей выгрузке списка. Точные даты и подробности — по ссылке на запись в источнике.
          </p>
        </>
      )}
    </div>
  );
}
