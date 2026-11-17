import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/ui";
import { PostCard } from "@/components/PostCard";
import { allPosts } from "@/lib/blog";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Blog" });
  // nothing to read yet: keep the empty page out of the index
  const empty = (await allPosts()).length === 0;
  return { title: t("metaTitle"), description: t("sub"), ...seo(locale, "/blog"), ...(empty ? { robots: { index: false, follow: true } } : {}) };
}

export default async function Blog({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  const t = await getTranslations({ locale, namespace: "Blog" });
  // the list is in the reader's language; an English reader sees the Russian articles only while there is nothing in English
  let posts = await allPosts(locale);
  const russianOnly = locale === "en" && posts.length === 0;
  if (russianOnly) posts = await allPosts("ru");
  return (
    <div className="space-y-5">
      <PageTitle eyebrow={t("eyebrow")} title={t("title")} sub={t("sub")} />
      {russianOnly && posts.length > 0 && <p className="text-sm text-silver-2">{t("russianOnly")}</p>}
      {posts.length === 0 && <p className="card p-5 text-sm text-silver-2">{t("empty")}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {posts.map((p) => (
          <PostCard key={p.slug} post={p} locale={locale} />
        ))}
      </div>
    </div>
  );
}
