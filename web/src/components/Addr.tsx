"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn, short } from "@/lib/format";

/** Address in mono with copy and optional explorer link. `full` shows the whole string (wraps on mobile). */
export function Addr({ value, href, full = false, className }: { value: string; href?: string | null; full?: boolean; className?: string }) {
  const t = useTranslations("Ui");
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  };
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 font-mono text-[13px]", className)}>
      <span className={cn(full ? "break-all" : "truncate")} title={value}>
        {full ? value : short(value)}
      </span>
      <button type="button" onClick={copy} className="shrink-0 text-silver-3 hover:text-silver-1" aria-label={t("copy")}>
        {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
      </button>
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" className="shrink-0 text-silver-3 hover:text-silver-1" aria-label={t("openExplorer")}>
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </span>
  );
}
