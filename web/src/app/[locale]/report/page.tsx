import type { Metadata } from "next";
import { Card, PageTitle } from "@/components/ui";
import { isNetworkId } from "@/lib/networks";
import { ReportForm } from "./ReportForm";

export const metadata: Metadata = { title: "Сообщить об адресе" };

type SP = Promise<{ address?: string; network?: string; category?: string }>;

export default async function ReportPage({ searchParams }: { searchParams: SP }) {
  const { address, network, category } = await searchParams;
  return (
    <div className="space-y-6">
      <PageTitle title="Сообщить об адресе" sub="Расскажите, что случилось. Мы проверим." />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card className="text-base lg:col-span-2">
          <ReportForm category={category ?? ""} address={address?.slice(0, 100) ?? ""} network={network && (isNetworkId(network) || network === "tron") ? network : "ethereum"} />
        </Card>
        <div className="space-y-4">
          <Card className="text-base" title="Сколько это стоит">
            <p className="text-3xl font-semibold text-ok">Бесплатно</p>
          </Card>
          <Card className="text-base" title="Что будет дальше">
            <ol className="list-decimal space-y-2 pl-5 text-silver-2">
              <li>Проверим вручную.</li>
              <li>Подтвердим и добавим адрес в базу.</li>
              <li>Кража или фишинг: запишем в реестр в блокчейне.</li>
              <li>Ошибка: снимем метку. Санкционные списки не трогаем.</li>
            </ol>
          </Card>
          <p className="text-sm text-silver-2">Сообщение не публикуем. Личные данные не пишите.</p>
        </div>
      </div>
    </div>
  );
}
