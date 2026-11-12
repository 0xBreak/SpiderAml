import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageTitle } from "@/components/ui";

// Plain-language terms. Not written by a lawyer: keep them factual and in line with what the site really does.
const UPDATED = "2026-11-03";
const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

// Only the sources whose licence or terms ask for a credit (or that the owner chose to credit). Services used only through an API whose terms ask for no credit are not listed.
const SOURCES = [
  { links: [{ name: "OFAC SDN List (US Treasury)", url: "https://ofac.treasury.gov/sanctions-list-service" }], terms: "src_ofac" },
  { links: [{ name: "UK Sanctions List (FCDO)", url: "https://www.gov.uk/government/publications/the-uk-sanctions-list" }], terms: "src_uk" },
  { links: [{ name: "EU Financial Sanctions Files", url: "https://data.europa.eu/data/datasets/consolidated-list-of-persons-groups-and-entities-subject-to-eu-financial-sanctions" }], terms: "src_eu" },
  {
    links: [
      { name: "MyEtherWallet ethereum-lists", url: "https://github.com/MyEtherWallet/ethereum-lists" },
      { name: "Forta labelled-datasets", url: "https://github.com/forta-network/labelled-datasets" },
      { name: "etherscan-labels", url: "https://github.com/brianleect/etherscan-labels" },
    ],
    terms: "src_mit",
  },
  { links: [{ name: "GraphSense TagPacks", url: "https://github.com/graphsense/graphsense-tagpacks" }], terms: "src_graphsense" },
  { links: [{ name: "ScamSniffer scam-database", url: "https://github.com/scamsniffer/scam-database" }], terms: "src_gpl" },
  { links: [{ name: "Ethereum Fraud Dataset by Activity (Ishmukhamedov, 2025)", url: "https://doi.org/10.57967/hf/6373" }], terms: "src_ccby" },
  { links: [{ name: "CoinGecko", url: "https://www.coingecko.com" }], terms: "src_cg" },
  { links: [{ name: "Etherscan APIs", url: "https://etherscan.io" }], terms: "src_etherscan" },
] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Terms" });
  return { title: t("title"), description: t("metaDescription"), ...seo(locale, "/terms") };
}

export default async function Terms() {
  const t = await getTranslations("Terms");
  const sections = t.raw("sections") as [string, string][];
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageTitle title={t("title")} sub={`${t("updated")}: ${UPDATED}`} />
      {sections.map(([h, p]) => (
        <section key={h}>
          <h2 className="text-lg font-semibold text-silver-1">{h}</h2>
          <p className="mt-1.5 text-base leading-relaxed text-silver-2">{p}</p>
        </section>
      ))}
      <section>
        <h2 className="text-lg font-semibold text-silver-1">{t("sources")}</h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm">
          {SOURCES.map((s) => (
            <li key={s.terms}>
              {s.links.map((l, i) => (
                <span key={l.url}>
                  {i > 0 && ", "}
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="link">
                    {l.name}
                  </a>
                </span>
              ))}
              <span className="text-silver-3"> — {t(s.terms)}</span>
            </li>
          ))}
        </ul>
      </section>
      {EMAIL && (
        <section>
          <h2 className="text-lg font-semibold text-silver-1">{t("contact")}</h2>
          <p className="mt-1.5 text-base text-silver-2">
            {t("contactText")}{" "}
            <a href={`mailto:${EMAIL}`} className="link">
              {EMAIL}
            </a>
          </p>
        </section>
      )}
      <Link href="/privacy" className="link inline-block text-sm">
        {t("privacy")}
      </Link>
    </article>
  );
}
