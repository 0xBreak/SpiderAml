"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";
import { Link, usePathname } from "@/i18n/navigation";

export type NavItem = { href: string; label: string };
/** A plain link (`href`) or a group with a drop-down list (`items`). `accent` marks the link that is a call to action. */
export type NavGroup = { label: string; href?: string; items?: NavItem[]; accent?: boolean };

// next-intl's pathname has no locale prefix, so active detection works the same in both languages.
const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));
const BASE = "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[14px] text-silver-2 transition hover:bg-surface hover:text-silver-1";

/** The header row: a few links and drop-down groups. A group opens on hover and on click, closes on a click outside, on Escape and after a page change. */
export function NavDesktop({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => setOpen(null), [path]);
  useEffect(() => {
    const outside = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", esc); };
  }, []);
  return (
    <nav ref={ref} className="flex items-center gap-0.5" aria-label="Sections">
      {groups.map((g) => {
        if (!g.items) {
          const active = isActive(path, g.href!);
          return (
            <Link
              key={g.label}
              href={g.href!}
              aria-current={active ? "page" : undefined}
              className={cn(BASE, g.accent && "border border-line px-3 text-silver-1 hover:border-silver-3", active && "bg-surface text-silver-1")}
            >
              {g.label}
            </Link>
          );
        }
        const groupActive = g.items.some((i) => isActive(path, i.href));
        return (
          <div key={g.label} className="relative" onMouseEnter={() => setOpen(g.label)} onMouseLeave={() => setOpen(null)}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={open === g.label}
              onClick={() => setOpen(open === g.label ? null : g.label)}
              className={cn(BASE, groupActive && "bg-surface text-silver-1")}
            >
              {g.label}
              <ChevronDown className={cn("size-3.5 transition", open === g.label && "rotate-180")} aria-hidden />
            </button>
            {open === g.label && (
              <div role="menu" className="absolute left-0 top-full z-40 pt-1">
                <div className="w-56 rounded-lg border border-line bg-surface p-1.5 shadow-2xl">
                  {g.items.map((i) => (
                    <Link
                      key={i.href}
                      href={i.href}
                      role="menuitem"
                      aria-current={isActive(path, i.href) ? "page" : undefined}
                      className={cn("block rounded-md px-3 py-2 text-[14px] text-silver-2 transition hover:bg-bg hover:text-silver-1", isActive(path, i.href) && "bg-bg text-silver-1")}
                    >
                      {i.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** The mobile menu: the same groups as a vertical list with small headings; a tap closes the surrounding <details>. */
export function NavMobile({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  const close = (e: React.MouseEvent<HTMLElement>) => e.currentTarget.closest("details")?.removeAttribute("open");
  const link = (i: NavItem, accent = false) => {
    const active = isActive(path, i.href);
    return (
      <Link
        key={i.href}
        href={i.href}
        aria-current={active ? "page" : undefined}
        onClick={close}
        className={cn("rounded-md px-3 py-2.5 text-[15px] text-silver-2 transition hover:bg-bg hover:text-silver-1", accent && "border border-line text-silver-1", active && "bg-bg text-silver-1")}
      >
        {i.label}
      </Link>
    );
  };
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Sections">
      {groups.map((g) =>
        g.items ? (
          <div key={g.label} className="mt-1.5">
            <div className="label px-3 pb-1">{g.label}</div>
            {g.items.map((i) => link(i))}
          </div>
        ) : (
          link({ href: g.href!, label: g.label }, g.accent)
        ),
      )}
    </nav>
  );
}
