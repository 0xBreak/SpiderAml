"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

/** Section links. `vertical` is the mobile menu: a tap closes the surrounding <details>. */
export function NavLinks({ items, vertical = false }: { items: { href: string; label: string }[]; vertical?: boolean }) {
  const path = usePathname();
  return (
    <nav className={cn(vertical ? "flex flex-col gap-0.5" : "flex items-center gap-0.5")} aria-label="Разделы">
      {items.map((i) => {
        const active = i.href === "/" ? path === "/" : path === i.href || path.startsWith(`${i.href}/`);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            onClick={vertical ? (e) => e.currentTarget.closest("details")?.removeAttribute("open") : undefined}
            className={cn(
              "whitespace-nowrap rounded-md text-silver-2 transition hover:bg-surface hover:text-silver-1",
              vertical ? "px-3 py-2.5 text-[15px]" : "px-2.5 py-1.5 text-[14px]",
              active && "bg-surface text-silver-1",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
