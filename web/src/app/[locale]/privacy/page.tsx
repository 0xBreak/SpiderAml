import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageTitle } from "@/components/ui";

// Must match what the code really does: src/proxy.ts, src/components/ClickTracker.tsx, src/lib/metrics.ts and the data
// layer's metrics.ts (13-month retention there). Update this page whenever tracking changes.
const UPDATED = "2026-10-27";
const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Privacy");
  return { title: t("title") };
}

export default async function Privacy() {
  const t = await getTranslations("Privacy");
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
      {EMAIL && (
        <p className="text-base text-silver-2">
          {t("contactText")}{" "}
          <a href={`mailto:${EMAIL}`} className="link">
            {EMAIL}
          </a>
        </p>
      )}
      <Link href="/terms" className="link inline-block text-sm">
        {t("terms")}
      </Link>
    </article>
  );
}
