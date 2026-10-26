// Blog posts are MDX files in src/content/blog. Each exports `meta`; the file name is the URL slug.
import "server-only";
import { readdirSync } from "node:fs";
import { join } from "node:path";

export interface PostMeta {
  title: string;
  description: string;
  date: string;
  draft?: boolean;
}

const DIR = join(process.cwd(), "src/content/blog");

export const slugs = () =>
  readdirSync(DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));

export async function loadPost(slug: string) {
  if (!/^[a-z0-9-]+$/.test(slug) || !slugs().includes(slug)) return null;
  const mod = (await import(`@/content/blog/${slug}.mdx`)) as { default: React.ComponentType; meta: PostMeta };
  return { slug, meta: mod.meta, Content: mod.default };
}

export async function allPosts() {
  const posts = await Promise.all(slugs().map(loadPost));
  // drafts are visible while developing (npm run dev) and hidden on the live site
  const showDrafts = process.env.NODE_ENV !== "production";
  return posts
    .filter((p): p is NonNullable<typeof p> => !!p && (showDrafts || !p.meta.draft))
    .sort((a, b) => b.meta.date.localeCompare(a.meta.date));
}
