import type { Metadata } from "next";
import { PageTitle } from "@/components/ui";
import { SendForm } from "./SendForm";

export const metadata: Metadata = { title: "Безопасная отправка" };

type SP = Promise<{ to?: string }>;

export default async function SendPage({ searchParams }: { searchParams: SP }) {
  const { to } = await searchParams;
  return (
    <div className="space-y-5">
      <PageTitle
        title="Безопасная отправка"
        sub="Перевод USDC через смарт-контракт SpiderSend: перед отправкой он сверяет отправителя и получателя с реестром в блокчейне и не пропустит перевод на адрес из санкционного списка или на адрес взломщика."
      />
      <SendForm initialTo={to && /^0x[0-9a-fA-F]{40}$/.test(to) ? to : ""} />
    </div>
  );
}
