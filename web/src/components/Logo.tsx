import { Link } from "@/i18n/navigation";

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="SpiderAML">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/icon-64.png" alt="" width={30} height={30} className="rounded-md" />
      <span className="text-[17px] font-bold tracking-tight">
        <span className="text-silver-1">Spider</span>
        <span className="grad-text">AML</span>
      </span>
    </Link>
  );
}
