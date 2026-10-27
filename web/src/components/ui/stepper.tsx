import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepDef {
  id: string;
  title: string;
  hint?: string;
}

type Status = "done" | "active" | "todo";

/** Numbered step indicator. Controlled: pass every step with its status. */
export function Steps({ steps, className }: { steps: (StepDef & { status: Status })[]; className?: string }) {
  return (
    <ol className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-2", className)} aria-label="Шаги формы">
      {steps.map((s, i) => (
        <li key={s.id} className="flex flex-1 items-start gap-3 sm:gap-2.5" aria-current={s.status === "active" ? "step" : undefined}>
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center border text-[13px] font-semibold tabular-nums",
              s.status === "done" && "border-ok/50 bg-ok/10 text-ok",
              s.status === "active" && "border-accent/60 bg-accent/10 text-accent",
              s.status === "todo" && "border-line bg-surface-2 text-silver-3",
            )}
          >
            {s.status === "done" ? <Check className="size-4" aria-hidden /> : i + 1}
          </span>
          <span className="min-w-0 pt-0.5">
            <span className={cn("block text-sm font-medium", s.status === "todo" ? "text-silver-3" : "text-silver-1")}>{s.title}</span>
            {s.hint && <span className="mt-0.5 block text-xs text-silver-3">{s.hint}</span>}
          </span>
          {i < steps.length - 1 && <span className="mx-1 mt-3.5 hidden h-px flex-1 bg-line sm:block" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}
