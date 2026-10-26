import Link from "next/link";
import { ArrowRight, BookOpen, Fish, Landmark, LineChart, Send, ShieldCheck } from "lucide-react";
import { SearchForm } from "@/components/SearchForm";

const SECTIONS = [
  { href: "/check", icon: ShieldCheck, title: "Проверка адреса", text: "Есть ли адрес в санкционных списках, связан ли со взломами, фишингом или подозрительными переводами." },
  { href: "/aml", icon: LineChart, title: "AML-анализ токена", text: "Цена, ликвидность, крупные держатели, права владельца контракта — всё, что важно до покупки." },
  { href: "/whales", icon: Fish, title: "Киты", text: "Крупные переводы токена выше суммы, которую вы зададите: кто покупает, кто продаёт." },
  { href: "/sanctions", icon: Landmark, title: "Санкционные адреса", text: "Адреса из официальных санкционных списков с источником и датой проверки." },
  { href: "/send", icon: Send, title: "Безопасная отправка", text: "Перевод USDC, который не уйдёт на адрес из санкционного списка или на взломщика." },
  { href: "/blog", icon: BookOpen, title: "Блог", text: "Разборы exit-скамов и пирамид: как распознать и какие признаки тревожные." },
];

const EXAMPLES = [
  { address: "0x098B716B8Aaf21512996dC57EB0615e2383E2f96", network: "ethereum", label: "Санкционный адрес" },
  { address: "0x47666Fab8bd0Ac7003bce3f5C3585383F09486E2", network: "ethereum", label: "Взлом Bybit" },
  { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", network: "ethereum", label: "Обычный кошелёк" },
];

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="pt-4 sm:pt-10">
        <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Проверьте адрес <span className="grad-text">до того</span>, как отправить деньги
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] text-silver-2 sm:text-base">
          SpiderAML сверяет криптоадрес с санкционными списками и базами взломов и фишинга, анализирует токены и показывает простым языком, насколько это рискованно.
        </p>
        <div className="mt-6 max-w-3xl">
          <SearchForm action="/check" size="lg" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-silver-3">
          <span>Попробуйте:</span>
          {EXAMPLES.map((e) => (
            <Link key={e.address} href={`/check?address=${e.address}&network=${e.network}`} className="rounded border border-line px-2 py-0.5 text-silver-2 hover:border-silver-3 hover:text-silver-1">
              {e.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ href, icon: Icon, title, text }) => (
          <Link key={href} href={href} className="card group flex flex-col gap-2 p-5 transition hover:border-silver-3">
            <div className="flex items-center gap-2">
              <Icon className="size-5 text-accent" aria-hidden />
              <h2 className="font-semibold">{title}</h2>
              <ArrowRight className="ml-auto size-4 text-silver-3 transition group-hover:translate-x-0.5 group-hover:text-silver-1" aria-hidden />
            </div>
            <p className="text-sm text-silver-2">{text}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
