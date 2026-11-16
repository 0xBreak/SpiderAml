// Logo of a network next to its name. Server-safe; renders nothing for a network without a logo.
import { networkIconSrc } from "@/lib/networks";
import { cn } from "@/lib/format";

export function NetworkIcon({ id, className }: { id: string; className?: string }) {
  const src = networkIconSrc(id);
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={16} height={16} className={cn("mr-1.5 inline-block size-4 shrink-0 rounded-full align-[-3px]", className)} />;
}
