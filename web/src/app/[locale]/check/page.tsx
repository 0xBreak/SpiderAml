import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ExternalLink, Send } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Addr } from "@/components/Addr";
import { Gauge } from "@/components/Gauge";
import { SearchForm } from "@/components/SearchForm";
import { Badge, Bar, Card, ErrorBox, Notice, toneOfSeverity } from "@/components/ui";
import type { CheckReport, Finding } from "@/lib/api-types";
import { DataError, getCheck, limit } from "@/lib/data";
import { trackEvent } from "@/lib/metrics";
import { date, dateTime, pct, short, usd } from "@/lib/format";
import { NETWORKS, isNetworkId } from "@/lib/networks";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Check");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

type SP = Promise<{ address?: string; network?: string }>;

const TONE_OF_LEVEL: Record<CheckReport["level"], "ok" | "warn" | "crit"> = {
  low: "ok",
  medium: "warn",
  high: "crit",
  critical: "crit",
};

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

  const t = await getTranslations("Check");
  const tErr = await getTranslations("Errors");

  return (
    <div className="flex flex-col gap-7 sm:gap-9">
      <header className="flex flex-col gap-2">
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-silver-1 sm:text-4xl">{t("title")}</h1>
        <p className="max-w-2xl text-base leading-relaxed text-silver-2">{t("sub")}</p>
      </header>
      <SearchForm action="/check" address={address} network={network} />
      {error && <ErrorBox message={tErr.has(error.code) ? tErr(error.code) : error.message || tErr("fallback")} />}
      {report && <Report r={report} />}
      {!address && <HowItWorks />}
    </div>
  );
}

async function Report({ r }: { r: CheckReport }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Check");
  const tLv = await getTranslations("Level");
  const tCat = await getTranslations("Category");
  const tNote = await getTranslations("Note");
  const tRisk = await getTranslations("RiskFactor");
  const tChain = await getTranslations("Chain");
  const tCommon = await getTranslations("Common");
  const tone = TONE_OF_LEVEL[r.level];
  const title = tLv(`${r.level}.title`);
  const summary = tLv(`${r.level}.summary`);
  const advice = tLv.raw(`${r.level}.advice`) as string[];
  const net = r.kind === "evm" && isNetworkId(r.network) ? NETWORKS[r.network] : null;
  const explorer = net ? `${net.explorer}/address/${r.address}` : r.kind === "tron" ? `https://tronscan.org/#/address/${r.address}` : null;
  const risky = r.findings.filter((f) => f.category !== "info");
  const owner = r.tags[0];
  const chainLabel = r.kind === "tron" ? tChain("tron") : (net?.label ?? r.network);
  const hasBadges = r.sanctions.length > 0 || r.possibleScam || r.contract?.isContract;
  const showSummary = risky.length > 0 || r.portfolio != null || r.counterparties != null;
  const hasAside = showSummary || r.tags.length > 0 || r.onchain != null;

  return (
    <div className="flex flex-col gap-6">
      {/* verdict */}
      <section className="border border-line bg-surface">
        <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[13rem_minmax(0,1fr)] md:items-center md:gap-8">
          <div className="[&>svg]:w-44 md:[&>svg]:w-52">
            <Gauge score={r.score} tone={tone} />
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            {hasBadges && (
              <div className="flex flex-wrap items-center gap-2">
                {r.sanctions.length > 0 && <Badge tone="crit">{t("sanctionedBadge")}</Badge>}
                {r.possibleScam && r.sanctions.length === 0 && <Badge tone="crit">{t("scamBadge")}</Badge>}
                {r.contract?.isContract && (
                  <Badge tone="muted">
                    {t("contractBadge")}
                    {r.contract.symbol ? ` ${r.contract.symbol}` : ""}
                  </Badge>
                )}
              </div>
            )}
            <h2
              className={cn(
                "text-balance text-3xl font-semibold tracking-tight sm:text-4xl",
                tone === "crit" ? "text-crit" : tone === "warn" ? "text-warn" : "text-ok",
              )}
            >
              {title}
            </h2>
            <p className="max-w-2xl text-lg leading-relaxed text-silver-1">{summary}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-silver-2">
              <Addr value={r.address} href={explorer} full />
              <span>{chainLabel}</span>
              {owner && <span>{owner.label}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 px-5 pb-5 sm:px-7 sm:pb-7">
          <ul className="flex max-w-2xl flex-col gap-2 text-base leading-relaxed text-silver-1">
            {advice.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          {r.level !== "critical" && r.kind === "evm" && (
            <div>
              <Link href={`/send?to=${r.address}`} data-track="check:send" className="btn-ghost h-11 text-base">
                <Send className="size-4" /> {t("sendCta")}
              </Link>
            </div>
          )}
        </div>
      </section>

      {r.notes.map((n) => (
        <Notice key={n}>{tNote.has(n) ? tNote(n) : n}</Notice>
      ))}

      <div className={cn("grid gap-5", hasAside && "lg:grid-cols-3")}>
        <div className={cn("flex flex-col gap-5", hasAside && "lg:col-span-2")}>
          <Reasons findings={risky} />
          {r.sanctions.length > 0 && <Sanctions r={r} />}
          {r.contract?.isContract && r.contract.risk && <TokenRisk r={r} />}
          {r.counterparties && <Counterparties r={r} />}
        </div>
        {hasAside && (
          <div className="flex flex-col gap-5">
            {showSummary && (
              <Card title={t("shortTitle")}>
                <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                  <Metric label={t("riskSignals")} value={risky.length} tone={risky.length ? "warn" : "ok"} />
                  {r.portfolio && (
                    <Metric
                      label={t("balance")}
                      value={usd(r.portfolio.totalUsd, true, locale)}
                      sub={r.portfolio.change1dPct != null ? t("balanceDay", { pct: pct(r.portfolio.change1dPct) }) : undefined}
                    />
                  )}
                  {r.counterparties && (
                    <Metric
                      label={t("counterpartiesChecked")}
                      value={r.counterparties.checked}
                      sub={t("flaggedSub", { count: r.counterparties.flagged.length })}
                    />
                  )}
                </dl>
              </Card>
            )}
            {r.tags.length > 0 && (
              <Card title={t("ownerTitle")}>
                <ul className="flex flex-col gap-2">
                  {r.tags.slice(0, 6).map((tag) => (
                    <li key={`${tag.source}-${tag.label}`} className="text-base leading-snug text-silver-1">
                      {tag.label}
                      {tag.chain && <span className="ml-2 text-sm text-silver-2">{tag.chain}</span>}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {r.onchain && (
              <Card title={t("registryTitle")}>
                <p className="text-base leading-relaxed text-silver-2">
                  {r.onchain.level > 0 ? (
                    <>
                      {t.rich("recordedAs", {
                        category: tCat.has(r.onchain.category) ? tCat(`${r.onchain.category}.name`) : r.onchain.category,
                        level: r.onchain.level,
                        b: (chunks) => <b className="text-silver-1">{chunks}</b>,
                      })}
                      {r.onchain.level >= 3 && ` ${t("blockedNote")}`}
                    </>
                  ) : (
                    t("noRecord")
                  )}
                </p>
                <a
                  href={r.onchain.explorer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link mt-3 inline-flex items-center gap-1.5 text-base"
                >
                  {t("registryLink")} <ExternalLink className="size-4" />
                </a>
              </Card>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-base leading-relaxed text-silver-2">
          {tCommon("disclaimer")} <span className="text-sm text-silver-2">{t("checkedAt", { date: dateTime(r.checkedAt, locale) })}</span>
        </p>
        <Link href={`/report?address=${r.address}&network=${r.network}`} data-track="check:report" className="link shrink-0 text-base">
          {t("disagree")}
        </Link>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "ok" | "warn" | "crit";
}) {
  return (
    <div>
      <dt className="text-base text-silver-2">{label}</dt>
      <dd
        className={cn(
          "mt-1 text-3xl font-semibold tabular-nums text-silver-1",
          tone === "crit" && "text-crit",
          tone === "warn" && "text-warn",
          tone === "ok" && "text-ok",
        )}
      >
        {value}
        {sub && <span className="mt-0.5 block text-sm font-normal text-silver-2">{sub}</span>}
      </dd>
    </div>
  );
}

async function Reasons({ findings }: { findings: Finding[] }) {
  const t = await getTranslations("Check");
  const tCat = await getTranslations("Category");
  if (findings.length === 0)
    return (
      <Card title={t("noReasonsTitle")}>
        <p className="text-base text-silver-2">{t("noReasons")}</p>
      </Card>
    );
  const groups = new Map<string, Finding[]>();
  for (const f of findings) groups.set(f.category, [...(groups.get(f.category) ?? []), f]);
  return (
    <Card title={t("reasonsTitle")}>
      <div className="flex flex-col gap-5">
        {[...groups].map(([cat, list]) => {
          const worst = Math.max(...list.map((f) => f.severity));
          return (
            <div key={cat} className="flex flex-col gap-2.5">
              <Badge tone={toneOfSeverity(worst)} className="self-start">
                {tCat.has(cat) ? tCat(`${cat}.name`) : cat}
              </Badge>
              <ul className="flex flex-col gap-2">
                {list.map((f, i) => (
                  <li key={i} className="text-base leading-snug text-silver-1">
                    {f.label}
                    <span className="mt-0.5 block text-sm text-silver-2">
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

async function Sanctions({ r }: { r: CheckReport }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Check");
  return (
    <Card title={t("sanctionsTitle")}>
      <ul className="flex flex-col gap-5">
        {r.sanctions.map((s) => (
          <li key={s.list + s.name} className="flex flex-col gap-1">
            <div className="text-base font-semibold text-silver-1">{s.name}</div>
            <div className="text-base text-silver-2">
              {s.list}
              {s.program ? `, ${s.program}` : ""}, {s.asset}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-silver-2">
              <span>{t("inBaseSince", { first: date(s.firstSeen, locale), checked: date(s.checkedAt, locale) })}</span>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="link">
                {t("sourceRecord")}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

async function TokenRisk({ r }: { r: CheckReport }) {
  const t = await getTranslations("Check");
  const tRisk = await getTranslations("RiskFactor");
  const risk = r.contract!.risk!;
  const symbol = r.contract?.symbol ? ` ${r.contract.symbol}` : "";
  return (
    <Card
      title={`${t("tokenRiskTitle")}${symbol}`}
      right={
        <Link href={`/token?address=${r.address}&network=${r.network}`} className="link text-base">
          {t("fullAnalysis")}
        </Link>
      }
    >
      <ul className="flex flex-col gap-5">
        {risk.factors.map((f) => {
          const share = f.max ? f.points / f.max : 0;
          return (
            <li key={f.key} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-base text-silver-1">{tRisk.has(f.key) ? tRisk(`${f.key}.name`) : f.label}</span>
                <span className="shrink-0 text-sm tabular-nums text-silver-2">
                  {f.points}/{f.max}
                </span>
              </div>
              <Bar value={f.points} max={f.max} tone={share >= 0.6 ? "crit" : share >= 0.3 ? "warn" : "ok"} />
              {tRisk.has(f.key) && <p className="text-sm leading-relaxed text-silver-2">{tRisk(`${f.key}.about`)}</p>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

async function Counterparties({ r }: { r: CheckReport }) {
  const t = await getTranslations("Check");
  const tCat = await getTranslations("Category");
  const c = r.counterparties!;
  const explorer = isNetworkId(r.network) ? NETWORKS[r.network].explorer : null;
  return (
    <Card title={t("cpTitle")}>
      {c.flagged.length === 0 ? (
        <p className="text-base text-silver-2">{t("cpEmpty")}</p>
      ) : (
        <>
          <p className="text-base leading-relaxed text-silver-2">{t("cpFound")}</p>
          <ul className="mt-4 flex flex-col gap-4">
            {c.flagged.map((f) => (
              <li key={f.address} className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={toneOfSeverity(f.severity)}>
                      {tCat.has(f.category) ? tCat(`${f.category}.name`) : f.category}
                    </Badge>
                    <Link
                      href={`/check?address=${f.address}&network=${r.network}`}
                      className="font-mono text-sm text-silver-1 hover:underline"
                    >
                      {short(f.address)}
                    </Link>
                  </div>
                  <span className="text-base leading-snug text-silver-2">{f.label}</span>
                </div>
                {explorer && (
                  <a
                    href={`${explorer}/address/${f.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-1 text-silver-2 hover:text-silver-1"
                    aria-label={t("explorerLabel")}
                  >
                    <ExternalLink className="size-4" />
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

async function HowItWorks() {
  const t = await getTranslations("Check");
  const steps = [
    [t("howSanctionsTitle"), t("howSanctionsText")],
    [t("howExploitTitle"), t("howExploitText")],
    [t("howCpTitle"), t("howCpText")],
    [t("howTokensTitle"), t("howTokensText")],
  ];
  return (
    <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map(([title, d]) => (
        <div key={title} className="flex flex-col gap-1.5">
          <h2 className="text-base font-semibold text-silver-1">{title}</h2>
          <p className="text-base leading-relaxed text-silver-2">{d}</p>
        </div>
      ))}
    </div>
  );
}
