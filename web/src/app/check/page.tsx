import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Send } from "lucide-react";
import { Addr } from "@/components/Addr";
import { Gauge } from "@/components/Gauge";
import { SearchForm } from "@/components/SearchForm";
import { Badge, Bar, Card, ErrorBox, Notice, PageTitle, Stat, toneOfSeverity } from "@/components/ui";
import type { CheckReport, Finding } from "@/lib/api-types";
import { DataError, getCheck, limit } from "@/lib/data";
import { trackEvent } from "@/lib/metrics";
import { date, dateTime, pct, short, usd } from "@/lib/format";
import { NETWORKS, isNetworkId } from "@/lib/networks";
import { CATEGORY, DISCLAIMER, LEVEL, NOTE, RISK_FACTOR } from "@/lib/texts";

export const metadata: Metadata = { title: "AML-проверка адреса" };
export const dynamic = "force-dynamic";

type SP = Promise<{ address?: string; network?: string }>;

export default async function CheckPage({ searchParams }: { searchParams: SP }) {
  const { address, network: rawNetwork } = await searchParams;
  const network = rawNetwork && isNetworkId(rawNetwork) ? rawNetwork : "ethereum";

  let report: CheckReport | null = null;
  let error: DataError | null = null;
  if (address) {
    try {
      await limit("check", 20);
      report = await getCheck(address.trim(), network);
      trackEvent("check", `${report.kind === "tron" ? "tron" : network}:${report.level}`, "/check");
    } catch (e) {
      error = e instanceof DataError ? e : new DataError("UPSTREAM", "", 500);
      trackEvent("check", `error:${error.code}`, "/check");
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle
        title="AML-проверка адреса"
        sub="Вставьте адрес, на который собираетесь отправить деньги. Сверим его с официальными санкционными списками и базами взломов, фишинга и миксеров и посмотрим, с кем он взаимодействовал. Ethereum, BNB Chain, Arbitrum, Base, Polygon, Optimism, Avalanche и Tron."
      />
      <SearchForm action="/check" address={address} network={network} />
      {error && <ErrorBox code={error.code} message={error.message} />}
      {report && <Report r={report} />}
      {!address && <HowItWorks />}
    </div>
  );
}

function Report({ r }: { r: CheckReport }) {
  const lv = LEVEL[r.level];
  const net = r.kind === "evm" && isNetworkId(r.network) ? NETWORKS[r.network] : null;
  const explorer = net ? `${net.explorer}/address/${r.address}` : r.kind === "tron" ? `https://tronscan.org/#/address/${r.address}` : null;
  const risky = r.findings.filter((f) => f.category !== "info");
  const owner = r.tags[0];

  return (
    <div className="space-y-4">
      {/* verdict */}
      <section className={`card overflow-hidden ${lv.tone === "crit" ? "border-crit/50" : lv.tone === "warn" ? "border-warn/50" : "border-ok/40"}`}>
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <Gauge score={r.score} tone={lv.tone} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={`text-2xl font-semibold ${lv.tone === "crit" ? "text-crit" : lv.tone === "warn" ? "text-warn" : "text-ok"}`}>{lv.title}</h2>
              {r.sanctions.length > 0 && <Badge tone="crit">В санкционном списке</Badge>}
              {r.possibleScam && r.sanctions.length === 0 && <Badge tone="crit">Возможный скам</Badge>}
              {r.contract?.isContract && <Badge tone="muted">Контракт{r.contract.symbol ? ` · ${r.contract.symbol}` : ""}</Badge>}
            </div>
            <p className="text-[15px] text-silver-1">{lv.summary}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-silver-3">
              <Addr value={r.address} href={explorer} full />
              <span>· {r.kind === "tron" ? "Tron" : net?.label}</span>
              {owner && <span>· {owner.label}</span>}
            </div>
          </div>
        </div>
        <div className="border-t border-line bg-bg/40 px-5 py-4">
          <div className="label mb-2">Что делать</div>
          <ul className="space-y-1.5 text-sm text-silver-1">
            {lv.advice.map((a) => (
              <li key={a} className="flex gap-2">
                <span className="text-silver-3">—</span>
                {a}
              </li>
            ))}
          </ul>
          {r.level !== "critical" && r.kind === "evm" && (
            <Link href={`/send?to=${r.address}`} data-track="check:send" className="btn-ghost mt-3 h-9 text-[13px]">
              <Send className="size-4" /> Отправить USDC с проверкой
            </Link>
          )}
        </div>
      </section>

      {r.notes.map((n) => (
        <Notice key={n}>{NOTE[n] ?? n}</Notice>
      ))}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Reasons findings={risky} />
          {r.sanctions.length > 0 && <Sanctions r={r} />}
          {r.contract?.isContract && r.contract.risk && <TokenRisk r={r} />}
          {r.counterparties && <Counterparties r={r} />}
        </div>
        <div className="space-y-4">
          <Card title="Коротко">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              <Stat label="Оценка риска" value={`${r.score} / 100`} tone={lv.tone} />
              <Stat label="Сигналов риска" value={risky.length} tone={risky.length ? "warn" : "ok"} />
              {r.portfolio && <Stat label="Баланс (все сети)" value={usd(r.portfolio.totalUsd)} sub={r.portfolio.change1dPct != null ? `за сутки ${pct(r.portfolio.change1dPct)}` : undefined} />}
              {r.counterparties && <Stat label="Проверено контрагентов" value={r.counterparties.checked} sub={`помечено: ${r.counterparties.flagged.length}`} />}
            </div>
          </Card>
          {r.tags.length > 0 && (
            <Card title="Кому принадлежит" hint="Открытые метки обозревателей">
              <ul className="space-y-1.5 text-sm">
                {r.tags.slice(0, 6).map((t) => (
                  <li key={`${t.source}-${t.label}`} className="text-silver-1">
                    {t.label}
                    {t.chain && <span className="text-silver-3"> · {t.chain}</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {r.onchain && (
            <Card title="Реестр в блокчейне" hint="Эти данные могут читать другие смарт-контракты">
              <p className="text-sm text-silver-2">
                {r.onchain.level > 0 ? (
                  <>
                    Записан как <b className="text-silver-1">{CATEGORY[r.onchain.category as Finding["category"]]?.name ?? r.onchain.category}</b>, уровень {r.onchain.level} из 3.
                    {r.onchain.level >= 3 && " Переводы через SpiderSend на этот адрес блокируются."}
                  </>
                ) : (
                  "Записи в реестре нет."
                )}
              </p>
              <a href={r.onchain.explorer} target="_blank" rel="noopener noreferrer" className="link mt-2 inline-flex items-center gap-1 text-sm">
                Контракт реестра (Arbitrum Sepolia) <ExternalLink className="size-3.5" />
              </a>
            </Card>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="max-w-2xl text-xs text-silver-3">
          {DISCLAIMER} Проверено {dateTime(r.checkedAt)}.
        </p>
        <Link href={`/report?address=${r.address}&network=${r.network}`} data-track="check:report" className="link text-sm">
          Не согласны с оценкой или знаете больше? Сообщить →
        </Link>
      </div>
    </div>
  );
}

function Reasons({ findings }: { findings: Finding[] }) {
  if (findings.length === 0)
    return (
      <Card title="Причины">
        <p className="text-sm text-silver-2">Ни один из источников не отметил этот адрес как рискованный.</p>
      </Card>
    );
  const groups = new Map<string, Finding[]>();
  for (const f of findings) groups.set(f.category, [...(groups.get(f.category) ?? []), f]);
  return (
    <Card title="Почему такая оценка" hint={`${findings.length} сигнал(ов) из открытых источников`}>
      <div className="space-y-4">
        {[...groups].map(([cat, list]) => {
          const c = CATEGORY[cat as Finding["category"]];
          const worst = Math.max(...list.map((f) => f.severity));
          return (
            <div key={cat}>
              <div className="flex items-center gap-2">
                <Badge tone={toneOfSeverity(worst)}>{c.name}</Badge>
              </div>
              <p className="mt-1.5 text-sm text-silver-2">{c.about}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {list.map((f, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-silver-1">
                    <span>{f.label}</span>
                    <span className="text-xs text-silver-3">
                      источник:{" "}
                      {f.url ? (
                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="link">
                          {f.sourceName}
                        </a>
                      ) : (
                        f.sourceName
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Sanctions({ r }: { r: CheckReport }) {
  return (
    <Card title="Официальные санкционные списки">
      <ul className="space-y-3">
        {r.sanctions.map((s) => (
          <li key={s.list + s.name} className="rounded-md border border-crit/30 bg-crit/5 p-3 text-sm">
            <div className="font-semibold text-silver-1">{s.name}</div>
            <div className="mt-1 text-silver-2">
              {s.list}
              {s.program && ` · программа ${s.program}`} · актив {s.asset}
            </div>
            <div className="mt-1 text-xs text-silver-3">
              В нашей базе с {date(s.firstSeen)}, сверено {date(s.checkedAt)} ·{" "}
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="link">
                запись в источнике
              </a>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TokenRisk({ r }: { r: CheckReport }) {
  const risk = r.contract!.risk!;
  return (
    <Card
      title={`Риски токена${r.contract?.symbol ? ` ${r.contract.symbol}` : ""}`}
      hint="Автоматические признаки, на которые стоит посмотреть до покупки"
      right={
        <Link href={`/token?address=${r.address}&network=${r.network}`} className="link text-sm">
          Полный анализ токена →
        </Link>
      }
    >
      <ul className="space-y-3">
        {risk.factors.map((f) => {
          const t = RISK_FACTOR[f.key];
          const share = f.max ? f.points / f.max : 0;
          return (
            <li key={f.key}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-silver-1">{t?.name ?? f.label}</span>
                <span className="tabular-nums text-silver-3">
                  {f.points}/{f.max}
                </span>
              </div>
              <div className="my-1.5">
                <Bar value={f.points} max={f.max} tone={share >= 0.6 ? "crit" : share >= 0.3 ? "warn" : "ok"} />
              </div>
              {t && <p className="text-xs text-silver-3">{t.about}</p>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Counterparties({ r }: { r: CheckReport }) {
  const c = r.counterparties!;
  const explorer = isNetworkId(r.network) ? NETWORKS[r.network].explorer : null;
  return (
    <Card title="С кем адрес взаимодействовал" hint={`Последние транзакции: ${c.checked} контрагентов`}>
      {c.flagged.length === 0 ? (
        <p className="text-sm text-silver-2">Среди последних контрагентов нет адресов с метками риска.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-silver-2">Среди контрагентов есть адреса с метками риска. Это не значит, что сам адрес рискованный, но это повод присмотреться.</p>
          <ul className="divide-y divide-line/60 text-sm">
            {c.flagged.map((f) => (
              <li key={f.address} className="flex flex-wrap items-center gap-2 py-2">
                <Badge tone={toneOfSeverity(f.severity)}>{CATEGORY[f.category].name}</Badge>
                <Link href={`/check?address=${f.address}&network=${r.network}`} className="font-mono text-[13px] text-silver-1 hover:underline">
                  {short(f.address)}
                </Link>
                <span className="text-silver-3">{f.label}</span>
                {explorer && (
                  <a href={`${explorer}/address/${f.address}`} target="_blank" rel="noopener noreferrer" className="ml-auto text-silver-3 hover:text-silver-1" aria-label="Обозреватель">
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function HowItWorks() {
  const steps = [
    ["Санкции", "Сверяем с официальным списком OFAC (США), обновляется автоматически."],
    ["Взломы и фишинг", "Открытые базы: ScamSniffer, MyEtherWallet, метки Etherscan, датасеты Forta, GoPlus."],
    ["Контрагенты", "Смотрим, с кем адрес недавно обменивался средствами."],
    ["Токены", "Для контрактов — концентрация держателей, ликвидность, права владельца."],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map(([t, d], i) => (
        <div key={t} className="card p-4">
          <div className="label">Шаг {i + 1}</div>
          <div className="mt-1 font-semibold">{t}</div>
          <p className="mt-1 text-sm text-silver-2">{d}</p>
        </div>
      ))}
    </div>
  );
}
