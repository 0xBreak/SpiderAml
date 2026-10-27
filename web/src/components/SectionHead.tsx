// Centered section header (landing-style): eyebrow label, title, sub.
// For tool pages use PageTitle (left-aligned) instead.
import type { ReactNode } from "react";

export function SectionHead({ eyebrow, title, sub }: { eyebrow: ReactNode; title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="label">{eyebrow}</div>
      <h2 className="mt-2 text-balance text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      {sub && <p className="mt-1.5 text-balance text-sm leading-relaxed text-silver-2">{sub}</p>}
    </div>
  );
}
