import type { Metadata } from "next";
import { Card, PageTitle } from "@/components/ui";
import { isNetworkId } from "@/lib/networks";
import { ReportForm } from "./ReportForm";

export const metadata: Metadata = { title: "Сообщить об адресе" };

type SP = Promise<{ address?: string; network?: string }>;

export default async function ReportPage({ searchParams }: { searchParams: SP }) {
  const { address, network } = await searchParams;
  return (
    <div className="space-y-5">
      <PageTitle
        title="Сообщить об адресе"
        sub="Столкнулись с фишингом, обманом или кражей — или считаете, что мы ошибочно пометили адрес? Расскажите, мы проверим."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <ReportForm address={address?.slice(0, 100) ?? ""} network={network && (isNetworkId(network) || network === "tron") ? network : "ethereum"} />
        </Card>
        <div className="space-y-4">
          <Card title="Сколько это стоит">
            <p className="text-2xl font-semibold text-ok">Бесплатно</p>
            <p className="mt-1 text-sm text-silver-2">Не нужен кошелёк, газ, регистрация или залог. Заявка сохраняется в базе SpiderAML (не в блокчейне), после отправки вы получите её номер и ссылку на статус.</p>
          </Card>
          <Card title="Что будет дальше">
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-silver-2">
              <li>Мы вручную проверяем сообщение и доказательства.</li>
              <li>Если риск подтверждается — адрес попадает в нашу базу и в AML-проверку.</li>
              <li>Критичные случаи (кража, фишинг) записываются в реестр в блокчейне, и SpiderSend перестаёт пропускать переводы на этот адрес.</li>
              <li>Если адрес помечен по ошибке — снимаем нашу метку. Отметки официальных санкционных списков мы изменить не можем.</li>
            </ol>
          </Card>
          <p className="text-xs text-silver-3">Не публикуем ваше сообщение и не раскрываем, кто его отправил. Не указывайте личные данные — они нам не нужны.</p>
        </div>
      </div>
    </div>
  );
}
