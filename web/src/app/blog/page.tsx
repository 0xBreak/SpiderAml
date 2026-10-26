import type { Metadata } from "next";
import Link from "next/link";
import { Badge, PageTitle } from "@/components/ui";
import { allPosts } from "@/lib/blog";
import { date } from "@/lib/format";

export const metadata: Metadata = { title: "Блог" };

export default async function Blog() {
  const posts = await allPosts();
  return (
    <div className="space-y-5">
      <PageTitle title="Блог" sub="Разборы exit-скамов и пирамид: как они устроены, как распознать и на какие признаки смотреть в первую очередь." />
      <div className="grid gap-3 sm:grid-cols-2">
        {posts.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="card flex flex-col gap-2 p-5 transition hover:border-silver-3">
            <div className="flex items-center gap-2 text-xs text-silver-3">
              {date(p.meta.date)}
              {p.meta.draft && <Badge tone="warn">Черновик</Badge>}
            </div>
            <h2 className="text-lg font-semibold">{p.meta.title}</h2>
            <p className="text-sm text-silver-2">{p.meta.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
