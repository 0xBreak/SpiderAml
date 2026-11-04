"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

const setNativeValue = (input: HTMLInputElement, value: string) =>
  // React and react-hook-form track the value themselves; the native setter plus an input event makes them see the change
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);

/**
 * "×" inside a text field: one tap empties it and puts the cursor back (an address pasted by mistake is slow to delete
 * letter by letter on a phone). Put it right after the <input>, inside the same `relative` parent; it shows only while
 * the field has text. Without JavaScript the field simply has no button.
 */
export function ClearInput() {
  const t = useTranslations("Common");
  const ref = useRef<HTMLButtonElement>(null);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const input = ref.current?.parentElement?.querySelector("input");
    if (!input) return;
    const sync = () => setFilled(input.value.length > 0);
    sync();
    input.addEventListener("input", sync);
    return () => input.removeEventListener("input", sync);
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      hidden={!filled}
      aria-label={t("clear")}
      title={t("clear")}
      onClick={() => {
        const input = ref.current?.parentElement?.querySelector("input");
        if (!input) return;
        setNativeValue(input, "");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
      }}
      className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center text-silver-3 hover:text-silver-1"
    >
      <X className="size-4" aria-hidden />
    </button>
  );
}
