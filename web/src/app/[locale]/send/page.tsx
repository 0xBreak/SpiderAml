import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/ui";
import { getMeta } from "@/lib/data";
import { WalletProvider } from "@/components/Wallet";
import { SendForm } from "./SendForm";

export async function generateMetadata({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Send" });
  return { title: t("title"), ...seo(locale, "/send", await searchParams) };
}
export const dynamic = "force-dynamic";

type SP = Promise<{ to?: string }>;

export default async function SendPage({ searchParams }: { searchParams: SP }) {
  const { to } = await searchParams;
  const t = await getTranslations("Send");
  const ethUsd = await getMeta()
    .then((m) => m.ethUsd)
    .catch(() => null);
  return (
    <div className="space-y-6">
      <PageTitle title={t("title")} sub={t("sub")} />
      {/* the wallet is needed only here: checks and reports work without one */}
      <WalletProvider>
        <SendForm initialTo={to && /^0x[0-9a-fA-F]{40}$/.test(to) ? to : ""} ethUsd={ethUsd} />
      </WalletProvider>
    </div>
  );
}
