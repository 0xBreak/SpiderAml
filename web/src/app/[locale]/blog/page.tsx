import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Badge, PageTitle } from "@/components/ui";
import { allPosts } from "@/lib/blog";
import { date } from "@/lib/format";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Blog" });
  return { title: t("title"), description: t("sub") };
}

export default async function Blog({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  const t = await getTranslations({ locale, namespace: "Blog" });
  const posts = await allPosts();
  return (
    <div className="space-y-5">
      <PageTitle eyebrow="Материалы" title={t("title")} sub={t("sub")} />
      {posts.length === 0 && <p className="card p-5 text-sm text-silver-2">{t("empty")}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {posts.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="card flex flex-col gap-2 p-5 transition hover:border-silver-3">
            <div className="flex items-center gap-2 text-xs text-silver-3">
              {date(p.meta.date, locale)}
              {p.meta.draft && <Badge tone="warn">{t("draft")}</Badge>}
            </div>
            <h2 className="text-lg font-semibold">{p.meta.title}</h2>
            <p className="text-sm text-silver-2">{p.meta.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
