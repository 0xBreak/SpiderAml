// Article card for the blog list and the home page: date, topic pill, title, text, a link line and a picture on the right.
// The card is tinted by topic (teal for USDT, red for AML, violet for scams and analysis) with a soft glow behind the picture, kept calm for the dark site.
import { ArrowRight, CalendarDays } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { langOf, type Post } from "@/lib/blog";
import { date } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/** Tailwind classes are written out in full so the scanner finds them. `c` is the base colour for the picture. */
const TONE = {
  teal: {
    c: "oklch(0.62 0.12 184",
    card: "border-[oklch(0.62_0.12_184/0.32)] bg-[radial-gradient(ellipse_at_88%_50%,oklch(0.62_0.12_184/0.20),transparent_55%),linear-gradient(135deg,oklch(0.62_0.12_184/0.10),transparent_60%)] hover:border-[oklch(0.62_0.12_184/0.55)] hover:shadow-[0_8px_40px_-12px_oklch(0.62_0.12_184/0.5)]",
    pill: "text-[oklch(0.8_0.1_184)] border-[oklch(0.62_0.12_184/0.5)] bg-[oklch(0.62_0.12_184/0.08)]",
    link: "text-[oklch(0.8_0.12_184)]",
  },
  red: {
    c: "oklch(0.66 0.17 22",
    card: "border-[oklch(0.66_0.17_22/0.32)] bg-[radial-gradient(ellipse_at_88%_50%,oklch(0.66_0.17_22/0.18),transparent_55%),linear-gradient(135deg,oklch(0.66_0.17_22/0.09),transparent_60%)] hover:border-[oklch(0.66_0.17_22/0.55)] hover:shadow-[0_8px_40px_-12px_oklch(0.66_0.17_22/0.5)]",
    pill: "text-[oklch(0.8_0.13_22)] border-[oklch(0.66_0.17_22/0.5)] bg-[oklch(0.66_0.17_22/0.08)]",
    link: "text-[oklch(0.8_0.12_22)]",
  },
  violet: {
    c: "oklch(0.6 0.17 295",
    card: "border-[oklch(0.6_0.17_295/0.34)] bg-[radial-gradient(ellipse_at_88%_50%,oklch(0.6_0.17_295/0.22),transparent_55%),linear-gradient(135deg,oklch(0.6_0.17_295/0.10),transparent_60%)] hover:border-[oklch(0.6_0.17_295/0.55)] hover:shadow-[0_8px_40px_-12px_oklch(0.6_0.17_295/0.5)]",
    pill: "text-[oklch(0.8_0.12_295)] border-[oklch(0.6_0.17_295/0.5)] bg-[oklch(0.6_0.17_295/0.08)]",
    link: "text-[oklch(0.8_0.12_295)]",
  },
} as const;

type ArtKind = NonNullable<Post["meta"]["art"]>;

const OF: Record<ArtKind, { tone: keyof typeof TONE; tag: "tagUsdt" | "tagAml" | "tagAnalysis" }> = {
  lock: { tone: "teal", tag: "tagUsdt" },
  glitch: { tone: "teal", tag: "tagUsdt" },
  alert: { tone: "red", tag: "tagAml" },
  hood: { tone: "violet", tag: "tagAnalysis" },
};

export async function PostCard({ post, locale, track, className }: { post: Post; locale: Locale; track?: string; className?: string }) {
  const t = await getTranslations("Blog");
  const art: ArtKind = post.meta.art ?? "hood";
  const { tone, tag } = OF[art];
  const k = TONE[tone];
  const lang = langOf(post.meta);
  return (
    <Link
      href={`/blog/${post.slug}`}
      locale={lang === locale ? undefined : lang}
      data-track={track}
      className={cn("group relative flex items-stretch gap-2 overflow-hidden rounded-[18px] border p-5 shadow-[inset_0_1px_0_oklch(1_0_0/0.06)] transition duration-300 sm:gap-4 sm:p-7", k.card, className)}
    >
      <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-3.5 sm:max-w-[60%]">
        <div className="flex flex-wrap items-center gap-3 text-sm text-silver-2">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="size-4 text-silver-3" aria-hidden />
            {date(post.meta.date, locale)}
          </span>
          <span className={cn("rounded-full border px-3 py-0.5 text-sm font-medium", k.pill)}>{t(tag)}</span>
        </div>
        <h2 className="text-balance text-xl font-semibold leading-snug text-silver-1 sm:text-2xl">{post.meta.title}</h2>
        <p className="line-clamp-3 text-sm leading-relaxed text-silver-2 sm:text-[15px]">{post.meta.description}</p>
        <span className={cn("mt-auto inline-flex items-center gap-2 pt-2 text-[15px] font-semibold", k.link)}>
          {t("readMore")}
          <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
        </span>
      </div>
      {/* the picture has a black background: "screen" blending lets the tinted card show through, the mask fades its left edge */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/blog/cards/${art}.webp`}
        alt=""
        width={836}
        height={471}
        loading="lazy"
        className="pointer-events-none absolute inset-y-0 right-0 h-full w-[62%] object-cover object-center opacity-45 mix-blend-screen transition duration-500 [mask-image:linear-gradient(to_right,transparent,black_45%)] group-hover:opacity-100 group-hover:scale-[1.03] sm:w-[54%] sm:opacity-95"
      />
    </Link>
  );
}
