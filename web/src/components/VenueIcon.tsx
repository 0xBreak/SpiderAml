// Venue logo with a letter-avatar fallback. Server-safe (no hooks).
import { venueIconSrc } from "@/lib/brands";
import { cn } from "@/lib/format";

/** Real brand mark when vendored, otherwise the venue's first letter. `name` stays as adjacent text. */
export function VenueIcon({ name, size = "sm", className }: { name: string; size?: "xs" | "sm" | "md"; className?: string }) {
  const box = size === "xs" ? "size-4" : size === "md" ? "size-6" : "size-5";
  const src = venueIconSrc(name);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" aria-hidden="true" className={cn(box, "shrink-0 rounded-[5px] object-contain", className)} />;
  }
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span aria-hidden="true" className={cn(box, "flex shrink-0 items-center justify-center rounded-[5px] bg-surface-2 text-[10px] font-bold text-silver-2", className)}>
      {letter}
    </span>
  );
}
