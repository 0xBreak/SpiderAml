// Small presentational building blocks shared by every page. Server-safe (no hooks).
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/format";
import { ERROR_TEXT } from "@/lib/texts";

export type Tone = "ok" | "warn" | "crit" | "info" | "muted";

const TONE: Record<Tone, string> = {
  ok: "border-ok/40 bg-ok/10 text-ok",
  warn: "border-warn/40 bg-warn/10 text-warn",
  crit: "border-crit/40 bg-crit/10 text-crit",
  info: "border-accent/40 bg-accent/10 text-accent",
  muted: "border-line bg-surface-2 text-silver-2",
};

export const toneOfSeverity = (s: number): Tone => (s >= 3 ? "crit" : s === 2 ? "warn" : s === 1 ? "info" : "muted");

export function Badge({ tone = "muted", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium", TONE[tone], className)}>{children}</span>;
}

export function Card({ title, hint, right, children, className }: { title?: ReactNode; hint?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("card p-4 sm:p-5", className)}>
      {(title || right) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title && <h2 className="text-base font-semibold text-silver-1">{title}</h2>}
            {hint && <p className="mt-0.5 text-sm text-silver-3">{hint}</p>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <div className="rounded-md border border-line bg-bg/40 px-3 py-2.5">
      <div className="label">{label}</div>
      <div className={cn("mt-1 text-lg font-semibold tabular-nums", tone === "crit" && "text-crit", tone === "warn" && "text-warn", tone === "ok" && "text-ok")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-silver-3">{sub}</div>}
    </div>
  );
}

export function Bar({ value, max = 100, tone = "info" }: { value: number; max?: number; tone?: Tone }) {
  const w = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const color = tone === "crit" ? "bg-crit" : tone === "warn" ? "bg-warn" : tone === "ok" ? "bg-ok" : "bg-accent";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/60">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${w}%` }} />
    </div>
  );
}

export function PageTitle({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold tracking-tight text-silver-1 sm:text-3xl">{title}</h1>
      {sub && <p className="mt-1.5 max-w-2xl text-[15px] text-silver-2">{sub}</p>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  const Icon = tone === "crit" ? ShieldAlert : tone === "warn" ? AlertTriangle : tone === "ok" ? CheckCircle2 : Info;
  return (
    <div className={cn("flex gap-2.5 rounded-md border px-3 py-2.5 text-sm", TONE[tone])}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="text-silver-1">{children}</div>
    </div>
  );
}

export function ErrorBox({ code, message }: { code?: string; message?: string }) {
  return <Notice tone="warn">{(code && ERROR_TEXT[code]) || message || "Что-то пошло не так. Попробуйте ещё раз."}</Notice>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-line/40", className)} />;
}

export function CardSkeleton({ title, lines = 4 }: { title: string; lines?: number }) {
  return (
    <Card title={title}>
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className="h-5" />
        ))}
      </div>
    </Card>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-4 text-center text-sm text-silver-3">{children}</p>;
}
