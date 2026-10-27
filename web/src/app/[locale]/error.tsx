"use client";

import { useTranslations } from "next-intl";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("ErrorPage");
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-2 text-silver-2">{t("sub")}</p>
      <button onClick={reset} className="btn-primary mt-6">
        {t("retry")}
      </button>
    </div>
  );
}
