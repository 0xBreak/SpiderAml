import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { loadPost, slugs } from "@/lib/blog";
import { date } from "@/lib/format";
import { routing, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

type P = Promise<{ slug: string; locale: string }>;

export const dynamicParams = false;
export function generateStaticParams() {
  return routing.locales.flatMap((locale) => slugs().map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const post = await loadPost((await params).slug);
  return post ? { title: post.meta.title, description: post.meta.description } : {};
}

export default async function PostPage({ params }: { params: P }) {
  const { slug, locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  const t = await getTranslations({ locale, namespace: "Blog" });
  const post = await loadPost(slug);
  if (!post || (post.meta.draft && process.env.NODE_ENV === "production")) notFound();
  const { meta, Content } = post;
  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/blog" className="link text-sm">
        {t("back")}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{meta.title}</h1>
      <div className="mt-2 text-sm text-silver-3">{date(meta.date, locale)}</div>
      <div className="prose-spider mt-6">
        <Content />
      </div>
    </article>
  );
}
