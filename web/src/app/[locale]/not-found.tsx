import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-2 text-silver-2">{t("sub")}</p>
      <Link href="/" className="btn-primary mt-6">
        {t("home")}
      </Link>
    </div>
  );
}
