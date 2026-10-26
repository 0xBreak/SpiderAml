"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="mx-auto flex max-w-page gap-1 overflow-x-auto px-4 pb-2 text-sm" aria-label="Разделы">
      {items.map((i) => {
        const active = i.href === "/" ? path === "/" : path === i.href || path.startsWith(`${i.href}/`);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn("whitespace-nowrap rounded-md px-3 py-1.5 text-silver-2 transition hover:bg-surface hover:text-silver-1", active && "bg-surface text-silver-1")}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
