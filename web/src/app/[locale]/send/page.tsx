import type { Metadata } from "next";
import { PageTitle } from "@/components/ui";
import { getMeta } from "@/lib/data";
import { WalletProvider } from "@/components/Wallet";
import { SendForm } from "./SendForm";

export const metadata: Metadata = { title: "Безопасная отправка" };
export const dynamic = "force-dynamic";

type SP = Promise<{ to?: string }>;

export default async function SendPage({ searchParams }: { searchParams: SP }) {
  const { to } = await searchParams;
  const ethUsd = await getMeta()
    .then((m) => m.ethUsd)
    .catch(() => null);
  return (
    <div className="space-y-6">
      <PageTitle title="Безопасная отправка" sub="USDC через контракт, который блокирует рискованные адреса." />
      {/* the wallet is needed only here: checks and reports work without one */}
      <WalletProvider>
        <SendForm initialTo={to && /^0x[0-9a-fA-F]{40}$/.test(to) ? to : ""} ethUsd={ethUsd} />
      </WalletProvider>
    </div>
  );
}
