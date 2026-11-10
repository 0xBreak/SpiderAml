// Blog posts are MDX files in src/content/blog. Each exports `meta`; the file name is the URL slug.
// A post is written in one language and lives only under that language's URL (Russian: /blog/<slug>, English: /en/blog/<slug>);
// `translationOf` names the slug of the same article in the other language, so the two pages point at each other (hreflang).
import "server-only";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Locale } from "@/i18n/routing";

export interface PostMeta {
  title: string;
  description: string;
  date: string;
  draft?: boolean;
  /** the language the article is written in; older posts without it are Russian */
  lang?: Locale;
  /** slug of the same article in the other language, when it exists */
  translationOf?: string;
}

export interface Post {
  slug: string;
  meta: PostMeta;
  Content: React.ComponentType;
}

const DIR = join(process.cwd(), "src/content/blog");

export const slugs = () =>
  readdirSync(DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));

export const langOf = (meta: PostMeta): Locale => meta.lang ?? "ru";

export async function loadPost(slug: string): Promise<Post | null> {
  if (!/^[a-z0-9-]+$/.test(slug) || !slugs().includes(slug)) return null;
  const mod = (await import(`@/content/blog/${slug}.mdx`)) as { default: React.ComponentType; meta: PostMeta };
  return { slug, meta: mod.meta, Content: mod.default };
}

/** Drafts are visible while developing (npm run dev) and hidden on the live site. */
export const isPublished = (meta: PostMeta) => process.env.NODE_ENV !== "production" || !meta.draft;

/** The blog menu item, the sitemap entry and indexing of /blog wait for the first published article (in any language). */
export const hasPosts = async () => (await allPosts()).length > 0;

/** Published posts, newest first; with a locale, only the ones written in that language. */
export async function allPosts(locale?: string): Promise<Post[]> {
  const posts = await Promise.all(slugs().map(loadPost));
  return posts
    .filter((p): p is Post => !!p && isPublished(p.meta) && (!locale || langOf(p.meta) === locale))
    .sort((a, b) => b.meta.date.localeCompare(a.meta.date));
}

/** The published translation of a post, when there is one. */
export async function translationOf(post: Post): Promise<Post | null> {
  if (!post.meta.translationOf) return null;
  const other = await loadPost(post.meta.translationOf);
  return other && isPublished(other.meta) && langOf(other.meta) !== langOf(post.meta) ? other : null;
}

/** The two URL paths of an article (its own and its translation's) by language, for canonical and hreflang. */
export async function postPaths(post: Post): Promise<Partial<Record<Locale, string>>> {
  const other = await translationOf(post);
  return { [langOf(post.meta)]: `/blog/${post.slug}`, ...(other ? { [langOf(other.meta)]: `/blog/${other.slug}` } : {}) };
}
