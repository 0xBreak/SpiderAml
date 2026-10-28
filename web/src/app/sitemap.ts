import type { MetadataRoute } from "next";
import { allPosts } from "@/lib/blog";
import { urlOf } from "@/lib/seo";

// Tool pages and static pages in both languages, every entry with its translation as an alternate.
// Result pages (?address=…) are not listed: they are personal queries and carry noindex.
const PAGES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/check", priority: 0.9, changeFrequency: "weekly" },
  { path: "/token", priority: 0.8, changeFrequency: "weekly" },
  { path: "/whales", priority: 0.8, changeFrequency: "weekly" },
  { path: "/sanctions", priority: 0.8, changeFrequency: "daily" },
  { path: "/send", priority: 0.6, changeFrequency: "monthly" },
  { path: "/report", priority: 0.5, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  { path: "/terms", priority: 0.2, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "monthly" },
];

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await allPosts();
  const entries = [
    ...PAGES.map((p) => ({ ...p, lastModified: undefined as Date | undefined })),
    ...posts.map((p) => ({ path: `/blog/${p.slug}`, priority: 0.6, changeFrequency: "monthly" as const, lastModified: new Date(p.meta.date) })),
  ];
  return entries.flatMap(({ path, priority, changeFrequency, lastModified }) =>
    (["ru", "en"] as const).map((locale) => ({
      url: urlOf(locale, path),
      priority,
      changeFrequency,
      ...(lastModified ? { lastModified } : {}),
      alternates: { languages: { ru: urlOf("ru", path), en: urlOf("en", path) } },
    })),
  );
}
