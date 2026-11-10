import type { Metadata } from "next";
import { Heart, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Addr } from "@/components/Addr";
import { Card, Notice, PageTitle } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { DONATE_ADDRESS } from "@/lib/donate";
import { NETWORKS } from "@/lib/networks";
import { seo } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Support" });
  return { title: t("title"), description: t("metaDescription"), ...seo(locale, "/support") };
}

export default async function Support() {
  const t = await getTranslations("Support");
  const nets = Object.values(NETWORKS);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageTitle eyebrow={t("eyebrow")} title={t("title")} sub={t("sub")} />

      <Card title={t("addressTitle")}>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 border border-line bg-bg p-4">
            <Heart className="mt-0.5 size-5 shrink-0 text-crit" aria-hidden />
            <Addr value={DONATE_ADDRESS} href={`https://etherscan.io/address/${DONATE_ADDRESS}`} full className="text-sm sm:text-base" />
          </div>
          <p className="text-base leading-relaxed text-silver-2">{t("networks", { list: nets.map((n) => n.label).join(", ") })}</p>
          <p className="text-base leading-relaxed text-silver-2">{t("assets")}</p>
        </div>
      </Card>

      <Notice tone="warn">{t("careful")}</Notice>

      <Card title={t("whyTitle")}>
        <p className="text-base leading-relaxed text-silver-2">{t("why")}</p>
        <p className="mt-3 text-base leading-relaxed text-silver-2">{t("terms")}</p>
      </Card>

      <p className="flex items-start gap-2 text-base text-silver-2">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
        <span>
          {t("selfCheck")}{" "}
          <Link href={`/check?address=${DONATE_ADDRESS}`} data-track="support:selfcheck" className="link">
            {t("selfCheckLink")}
          </Link>
        </span>
      </p>
    </div>
  );
}
