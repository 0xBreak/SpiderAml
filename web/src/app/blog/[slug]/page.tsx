import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPost, slugs } from "@/lib/blog";
import { date } from "@/lib/format";

type P = Promise<{ slug: string }>;

export const dynamicParams = false;
export const generateStaticParams = () => slugs().map((slug) => ({ slug }));

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const post = await loadPost((await params).slug);
  return post ? { title: post.meta.title, description: post.meta.description } : {};
}

export default async function PostPage({ params }: { params: P }) {
  const post = await loadPost((await params).slug);
  if (!post || (post.meta.draft && process.env.NODE_ENV === "production")) notFound();
  const { meta, Content } = post;
  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/blog" className="link text-sm">
        ← Все статьи
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{meta.title}</h1>
      <div className="mt-2 text-sm text-silver-3">{date(meta.date)}</div>
      <div className="prose-spider mt-6">
        <Content />
      </div>
    </article>
  );
}
