import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import { getTranslations } from "next-intl/server";
import { Card, PageTitle } from "@/components/ui";
import { isNetworkId } from "@/lib/networks";
import { ReportForm } from "./ReportForm";

export async function generateMetadata({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Report" });
  return { title: t("title"), ...seo(locale, "/report", await searchParams) };
}

type SP = Promise<{ address?: string; network?: string; category?: string }>;

export default async function ReportPage({ searchParams }: { searchParams: SP }) {
  const { address, network, category } = await searchParams;
  const t = await getTranslations("Report");
  return (
    <div className="space-y-6">
      <PageTitle title={t("title")} sub={t("sub")} />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card className="text-base lg:col-span-2">
          <ReportForm category={category ?? ""} address={address?.slice(0, 100) ?? ""} network={network && (isNetworkId(network) || network === "tron") ? network : "ethereum"} />
        </Card>
        <div className="space-y-4">
          <Card className="text-base" title={t("cost")}>
            <p className="text-3xl font-semibold text-ok">{t("free")}</p>
            <p className="mt-2 text-sm text-silver-2">{t("freeNote")}</p>
          </Card>
          <Card className="text-base" title={t("next")}>
            <ol className="list-decimal space-y-2 pl-5 text-silver-2">
              {(t.raw("steps") as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
          </Card>
          <p className="text-sm text-silver-2">{t("privacy")}</p>
        </div>
      </div>
    </div>
  );
}
