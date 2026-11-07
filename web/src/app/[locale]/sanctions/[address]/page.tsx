// One address from an official sanctions list: what the regulator published, with a link to the record.
// Search-engine landing page for people who look up a specific address; wording stays factual (a regulator's entry, not our verdict).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import { Addr } from "@/components/Addr";
import { Card, ErrorBox, Notice, PageTitle } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { SanctionItem } from "@/lib/api-types";
import { DataError, getSanctions, limit } from "@/lib/data";
import { date } from "@/lib/format";
import { trackEvent } from "@/lib/metrics";
import { seo } from "@/lib/seo";

export const dynamic = "force-dynamic";

const SHAPE = /^[A-Za-z0-9]{20,100}$/;
const short = (a: string) => (a.length > 18 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a);
const EXPLORER: Record<string, (a: string) => string> = {
  evm: (a) => `https://etherscan.io/address/${a}`,
  tron: (a) => `https://tronscan.org/#/address/${a}`,
  bitcoin: (a) => `https://mempool.space/address/${a}`,
};

/** Every entry for this exact address (it can sit on several lists); case does not matter for hex addresses only. */
async function entries(address: string): Promise<SanctionItem[]> {
  const page = await getSanctions({ q: address, pageSize: 20 });
  return page.items.filter((s) => s.address.toLowerCase() === address.toLowerCase());
}

type Params = Promise<{ locale: string; address: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, address } = await params;
  if (!SHAPE.test(address)) return {};
  const t = await getTranslations({ locale, namespace: "SanctionAddr" });
  const found = await entries(address).catch(() => []);
  if (!found.length) return { robots: { index: false, follow: false } };
  return {
    title: t("metaTitle", { address: short(address), list: found[0].list }),
    description: t("metaDescription", { address, list: found[0].list }),
    ...seo(locale, `/sanctions/${address}`),
  };
}

export default async function SanctionedAddress({ params }: { params: Params }) {
  const { address } = await params;
  if (!SHAPE.test(address)) notFound();
  const t = await getTranslations("SanctionAddr");
  const tChain = await getTranslations("Chain");
  const tc = await getTranslations("Common");
  const locale = (await getLocale()) as Locale;

  let found: SanctionItem[] = [];
  try {
    await limit("sanction-address", 30);
    found = await entries(address);
  } catch (e) {
    const err = e instanceof DataError ? e : new DataError("UPSTREAM", "", 500);
    return <ErrorBox code={err.code} message={err.message} />;
  }
  if (!found.length) notFound();
  trackEvent("sanctions_search", found[0].list, "/sanctions", { target: found[0].address, network: found[0].chain, trusted: true });

  return (
    <div className="space-y-5">
      <PageTitle eyebrow={t("eyebrow")} title={t("title", { address: short(address) })} sub={t("sub")} />
      <Card>
        <Addr value={found[0].address} href={EXPLORER[found[0].chain]?.(found[0].address)} className="text-base text-silver-1" />
      </Card>
      {found.map((s) => (
        <Card key={s.list + s.name} title={s.list}>
          <dl className="grid gap-x-6 gap-y-3 text-base sm:grid-cols-2">
            <div>
              <dt className="label">{t("network")}</dt>
              <dd className="text-silver-1">{tChain.has(s.chain) ? tChain(s.chain) : s.chain} · {s.asset}</dd>
            </div>
            <div>
              <dt className="label">{t("listedAs")}</dt>
              <dd className="text-silver-1">{s.name}</dd>
            </div>
            {s.program && (
              <div>
                <dt className="label">{t("program")}</dt>
                <dd className="text-silver-1">{s.program}</dd>
              </div>
            )}
            <div>
              <dt className="label">{t("listed")}</dt>
              <dd className="text-silver-1">{s.listedAt ? date(s.listedAt, locale) : t("notGiven")}</dd>
            </div>
          </dl>
          <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="link mt-4 inline-flex items-center gap-1.5 text-sm">
            {t("source")} <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </Card>
      ))}
      <Notice>{tc("disclaimer")}</Notice>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href={`/check?address=${address}`} className="link">
          {t("check")}
        </Link>
        <Link href="/sanctions" className="link">
          {t("back")}
        </Link>
      </div>
    </div>
  );
}
