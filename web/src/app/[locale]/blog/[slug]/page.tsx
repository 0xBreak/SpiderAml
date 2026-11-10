import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isPublished, langOf, loadPost, postPaths, slugs, translationOf } from "@/lib/blog";
import { date } from "@/lib/format";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { seoOwn, urlOf, SITE } from "@/lib/seo";

type P = Promise<{ slug: string; locale: string }>;

// an article exists only under the language it is written in; the other locale gets a 404, not a copy with the wrong lang
export const dynamicParams = false;
export async function generateStaticParams() {
  const posts = await Promise.all(slugs().map(loadPost));
  return posts.filter((p) => p != null).map((p) => ({ locale: langOf(p.meta), slug: p.slug }));
}

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { slug, locale } = await params;
  const post = await loadPost(slug);
  if (!post || langOf(post.meta) !== locale) return {};
  return {
    title: post.meta.title,
    description: post.meta.description,
    ...seoOwn(locale, await postPaths(post)),
    openGraph: { type: "article", publishedTime: post.meta.date, siteName: "SpiderAML", locale: locale === "en" ? "en_US" : "ru_RU", images: ["/opengraph-image.jpg"] },
    twitter: { card: "summary_large_image" },
    ...(isPublished(post.meta) ? {} : { robots: { index: false, follow: false } }),
  };
}

export default async function PostPage({ params }: { params: P }) {
  const { slug, locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  const t = await getTranslations({ locale, namespace: "Blog" });
  const post = await loadPost(slug);
  if (!post || !isPublished(post.meta) || langOf(post.meta) !== locale) notFound();
  const { meta, Content } = post;
  const other = await translationOf(post);
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    datePublished: meta.date,
    inLanguage: locale,
    image: `${SITE}/opengraph-image.jpg`,
    mainEntityOfPage: urlOf(locale, `/blog/${slug}`),
    author: { "@type": "Organization", name: "SpiderAML", url: SITE },
    publisher: { "@type": "Organization", name: "SpiderAML", url: SITE },
  };
  return (
    <article className="mx-auto max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/blog" className="link">
          {t("back")}
        </Link>
        {other && (
          <Link href={`/blog/${other.slug}`} locale={langOf(other.meta)} className="link" hrefLang={langOf(other.meta)}>
            {t("otherLanguage")}
          </Link>
        )}
      </div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{meta.title}</h1>
      <div className="mt-2 text-sm text-silver-3">{date(meta.date, locale)}</div>
      <div className="prose-spider mt-6">
        <Content />
      </div>
    </article>
  );
}
