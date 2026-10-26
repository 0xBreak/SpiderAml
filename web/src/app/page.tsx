import Link from "next/link";
import { ArrowRight, BookOpen, Fish, Flag, Landmark, LineChart, Send, ShieldCheck, type LucideIcon } from "lucide-react";
import { SearchForm } from "@/components/SearchForm";
import type { MetaInfo } from "@/lib/api-types";
import { getMeta } from "@/lib/data";
import { dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

interface Tool {
  href: string;
  icon: LucideIcon;
  title: string;
  question: string;
  looks: string[];
  data: string;
}

const TOOLS: Tool[] = [
  {
    href: "/check",
    icon: ShieldCheck,
    title: "AML-проверка адреса",
    question: "Безопасно ли отправить деньги на этот адрес?",
    looks: ["Есть ли адрес в санкционных списках США, Великобритании, ЕС", "Связан ли со взломами, кражами, фишингом, миксерами", "С какими рискованными адресами он недавно взаимодействовал"],
    data: "Официальные санкционные списки и открытые базы рисков",
  },
  {
    href: "/token",
    icon: LineChart,
    title: "Анализ токена",
    question: "Стоит ли доверять этому токену?",
    looks: ["Цена, капитализация, объём торгов на биржах и DEX", "Сколько денег в пулах и можно ли продать без потерь", "Кто держит большую часть токенов и может ли владелец менять правила"],
    data: "Блокчейн (QuickNode), Zerion, CoinGecko",
  },
  {
    href: "/whales",
    icon: Fish,
    title: "Киты",
    question: "Кто сейчас крупно покупает или продаёт токен?",
    looks: ["Все переводы токена дороже заданной суммы", "Покупки и продажи через DEX по каждому кошельку", "Метки: биржи, фонды, рискованные адреса"],
    data: "Переводы в блокчейне + наши метки",
  },
  {
    href: "/sanctions",
    icon: Landmark,
    title: "Санкционные адреса",
    question: "Какие криптоадреса официально под санкциями?",
    looks: ["Только то, что опубликовали регуляторы", "Кому принадлежит адрес и по какой программе", "Ссылка на запись в источнике и дата включения"],
    data: "OFAC SDN (США), UK Sanctions List, EU Consolidated List",
  },
];

const EXTRA = [
  { href: "/send", icon: Send, title: "Безопасная отправка", text: "Перевод USDC через смарт-контракт, который сам откажется отправлять на санкционный адрес или адрес взломщика." },
  { href: "/report", icon: Flag, title: "Сообщить об адресе", text: "Знаете рискованный адрес или считаете, что мы ошиблись? Бесплатно, без регистрации." },
  { href: "/blog", icon: BookOpen, title: "Блог", text: "Как устроены exit-скамы и пирамиды и какие признаки видны заранее." },
];

const LEVELS = [
  { range: "0–19", name: "Низкий риск", color: "bg-ok", text: "В известных списках риска адрес не найден. Это не гарантия, но тревожных сигналов нет." },
  { range: "20–49", name: "Есть сигналы риска", color: "bg-warn", text: "Отдельные тревожные признаки, например взаимодействие с рискованными адресами. Стоит разобраться." },
  { range: "50–79", name: "Высокий риск", color: "bg-crit", text: "Серьёзные отметки в открытых базах. Отправлять средства не рекомендуем." },
  { range: "80–100", name: "Критический риск", color: "bg-crit", text: "Санкционный список, взлом, кража или фишинг. Не отправляйте средства." },
];

const SOURCE_TEXT: Record<string, string> = {
  "ofac-sdn": "Санкционный список Минфина США",
  "uk-fcdo": "Санкционный список Великобритании",
  "eu-fsf": "Сводный санкционный список ЕС",
  scamsniffer: "Дрейнеры и фишинговые адреса",
  "mew-darklist": "Фишинг и мошеннические адреса",
  "etherscan-labels": "Метки обозревателей: биржи, протоколы, взломщики — 6 сетей",
  forta: "Взломы, фишинг и вредоносные контракты",
  manual: "Свежие инциденты, проверенные вручную",
};

const fmt = (n: number) => n.toLocaleString("ru-RU");

export default async function Home() {
  const meta: MetaInfo | null = await getMeta().catch(() => null);
  const s = meta?.stats;

  return (
    <div className="space-y-14">
      <section className="pt-4 sm:pt-8">
        <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Проверьте криптоадрес <span className="grad-text">до того</span>, как отправить деньги
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] text-silver-2 sm:text-base">
          Вставьте адрес кошелька или токена. SpiderAML сверит его с официальными санкционными списками и базами взломов и фишинга и простым языком скажет, насколько это рискованно.
        </p>
        <div className="mt-6 max-w-3xl">
          <SearchForm action="/check" size="lg" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-silver-3">
          <span>Попробуйте:</span>
          {[
            ["0x098B716B8Aaf21512996dC57EB0615e2383E2f96", "Адрес под санкциями"],
            ["0x47666Fab8bd0Ac7003bce3f5C3585383F09486E2", "Взломщик Bybit"],
            ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "Обычный кошелёк"],
          ].map(([a, l]) => (
            <Link key={a} href={`/check?address=${a}&network=ethereum`} data-track={`home:example:${l}`} className="rounded border border-line px-2 py-0.5 text-silver-2 hover:border-silver-3 hover:text-silver-1">
              {l}
            </Link>
          ))}
        </div>
      </section>

      {s && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            [fmt(s.riskyAddresses), "адресов с отметками риска"],
            [fmt(s.sanctionedAddresses), `адресов из ${s.sanctionLists} официальных санкционных списков`],
            [fmt(s.labeledAddresses), "адресов с метками: биржи, протоколы, фонды"],
            ["7 + Tron", "сетей: Ethereum, BNB Chain, Arbitrum, Base, Polygon, Optimism, Avalanche"],
          ].map(([n, t]) => (
            <div key={t} className="card p-4">
              <div className="text-2xl font-semibold tabular-nums">{n}</div>
              <div className="mt-1 text-sm text-silver-2">{t}</div>
            </div>
          ))}
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold">Что умеет SpiderAML</h2>
        <p className="mt-1 text-sm text-silver-2">Четыре инструмента — каждый отвечает на свой вопрос.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {TOOLS.map(({ href, icon: Icon, title, question, looks, data }) => (
            <Link key={href} href={href} data-track={`home:tool:${href}`} className="card group flex flex-col p-5 transition hover:border-silver-3">
              <div className="flex items-center gap-2">
                <Icon className="size-5 text-accent" aria-hidden />
                <h3 className="font-semibold">{title}</h3>
                <ArrowRight className="ml-auto size-4 text-silver-3 transition group-hover:translate-x-0.5 group-hover:text-silver-1" aria-hidden />
              </div>
              <p className="mt-2 text-[15px] text-silver-1">{question}</p>
              <ul className="mt-3 space-y-1 text-sm text-silver-2">
                {looks.map((l) => (
                  <li key={l} className="flex gap-2">
                    <span className="text-accent">•</span>
                    {l}
                  </li>
                ))}
              </ul>
              <p className="mt-auto pt-3 text-xs text-silver-3">Данные: {data}</p>
            </Link>
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {EXTRA.map(({ href, icon: Icon, title, text }) => (
            <Link key={href} href={href} data-track={`home:extra:${href}`} className="card group flex flex-col gap-2 p-4 transition hover:border-silver-3">
              <div className="flex items-center gap-2">
                <Icon className="size-4 text-accent" aria-hidden />
                <h3 className="text-sm font-semibold">{title}</h3>
              </div>
              <p className="text-sm text-silver-2">{text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Как читать оценку</h2>
        <p className="mt-1 text-sm text-silver-2">Оценка от 0 до 100 — по самому серьёзному найденному сигналу. Под оценкой всегда видно, почему она такая и из какого источника.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LEVELS.map((l) => (
            <div key={l.range} className="card p-4">
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${l.color}`} aria-hidden />
                <span className="font-semibold">{l.name}</span>
                <span className="ml-auto text-xs tabular-nums text-silver-3">{l.range}</span>
              </div>
              <p className="mt-2 text-sm text-silver-2">{l.text}</p>
            </div>
          ))}
        </div>
      </section>

      {meta && (
        <section>
          <h2 className="text-xl font-semibold">Откуда данные</h2>
          <p className="mt-1 text-sm text-silver-2">Только открытые и официальные источники. Списки обновляются автоматически каждые 6 часов.</p>
          <div className="card mt-4 -mx-4 overflow-x-auto sm:mx-0">
            <table className="table min-w-[640px]">
              <thead>
                <tr>
                  <th>Источник</th>
                  <th>Что в нём</th>
                  <th className="text-right">Адресов</th>
                  <th className="text-right">Обновлено</th>
                </tr>
              </thead>
              <tbody>
                {meta.sources.map((src) => (
                  <tr key={src.id}>
                    <td>
                      {src.url ? (
                        <a href={src.url} target="_blank" rel="noopener noreferrer" className="link">
                          {src.name}
                        </a>
                      ) : (
                        src.name
                      )}
                      {src.kind === "sanctions" && <span className="ml-2 rounded border border-line px-1.5 text-[11px] text-silver-3">официальный</span>}
                    </td>
                    <td className="text-silver-2">{SOURCE_TEXT[src.id] ?? ""}</td>
                    <td className="text-right tabular-nums">{fmt(src.count)}</td>
                    <td className="whitespace-nowrap text-right text-silver-3">{dateTime(src.fetchedAt)}</td>
                  </tr>
                ))}
                <tr>
                  <td>GoPlus Security</td>
                  <td className="text-silver-2">Проверка в момент запроса (SlowMist, BlockSec и др.)</td>
                  <td className="text-right text-silver-3">онлайн</td>
                  <td className="text-right text-silver-3">—</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-silver-3">
            Один адрес может быть в нескольких источниках сразу, поэтому сумма по строкам больше числа уникальных адресов выше.
          </p>
        </section>
      )}

      <section className="card p-5">
        <h2 className="font-semibold">Важно знать</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-silver-2">
          <li>— Оценка автоматическая. Это не юридическое заключение и не обвинение: адреса попадают в списки и по ошибке.</li>
          <li>— Мы видим только открытые данные. Внутренние данные бирж и новые схемы, которых ещё нет в базах, нам не видны.</li>
          <li>— «Низкий риск» не гарантирует безопасность. Для крупной суммы отправьте сначала небольшую тестовую.</li>
        </ul>
      </section>
    </div>
  );
}
