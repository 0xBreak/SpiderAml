"use client";
// Network picker with logos in the field and in the list. A browser draws a native <select> list itself (no images),
// so after hydration a custom listbox takes over; before that (and without JavaScript) the plain <select> still submits the form.
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { networkIconSrc } from "@/lib/networks";
import { cn } from "@/lib/format";

type Option = { id: string; label: string };

function Logo({ id }: { id: string }) {
  const src = networkIconSrc(id);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" width={20} height={20} className="size-5 shrink-0 rounded-full" /> : <span className="size-5 shrink-0" />;
}

export function NetworkSelect({ options, defaultValue, className }: { options: Option[]; defaultValue: string; className?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [enhanced, setEnhanced] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.id === value) ?? options[0];

  useEffect(() => setEnhanced(true), []);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  if (!enhanced) {
    return (
      <select name="network" defaultValue={defaultValue} className={cn("input", className)}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  const pick = (o: Option) => {
    setValue(o.id);
    setOpen(false);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setActive(options.findIndex((o) => o.id === value));
        setOpen(true);
        return;
      }
      setActive((i) => (i + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
    } else if ((e.key === "Enter" || e.key === " ") && open) {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={root} className="relative">
      <input type="hidden" name="network" value={value} />
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setActive(options.findIndex((o) => o.id === value));
          setOpen((v) => !v);
        }}
        onKeyDown={onKey}
        className={cn("input flex items-center gap-2.5 text-left", className)}
      >
        <Logo id={current.id} />
        <span className="flex-1 truncate">{current.label}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-silver-3 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul role="listbox" className="absolute left-0 right-0 z-30 mt-1 max-h-80 overflow-auto border border-line bg-surface-2 py-1 shadow-xl">
          {options.map((o, i) => (
            <li
              key={o.id}
              role="option"
              aria-selected={o.id === value}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(o)}
              className={cn("flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-silver-1", i === active && "bg-line", o.id === value && "text-accent-from")}
            >
              <Logo id={o.id} />
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
