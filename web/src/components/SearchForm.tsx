// Address search. A plain GET form, so it works without JavaScript and every result has a shareable URL.
import { Search } from "lucide-react";
import { NETWORK_IDS, NETWORKS } from "@/lib/networks";
import { cn } from "@/lib/format";

interface Props {
  action: "/check" | "/token" | "/whales";
  address?: string;
  network?: string;
  placeholder?: string;
  button?: string;
  size?: "md" | "lg";
  /** extra controls rendered before the button (e.g. whale threshold) */
  children?: React.ReactNode;
}

export function SearchForm({ action, address, network = "ethereum", placeholder, button = "Проверить", size = "md", children }: Props) {
  return (
    <form action={action} method="get" className={cn("flex w-full flex-col gap-2 sm:flex-row", size === "lg" && "sm:gap-3")} role="search">
      <label className="relative flex-1">
        <span className="sr-only">Адрес</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-silver-3" aria-hidden />
        <input
          name="address"
          defaultValue={address}
          required
          maxLength={100}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder ?? "Адрес кошелька или токена: 0x… или T…"}
          className={cn("input pl-9 font-mono", size === "lg" && "h-12 text-[15px]")}
        />
      </label>
      <label className="sm:w-44">
        <span className="sr-only">Сеть</span>
        <select name="network" defaultValue={network} className={cn("input", size === "lg" && "h-12")}>
          {NETWORK_IDS.map((id) => (
            <option key={id} value={id}>
              {NETWORKS[id].label}
            </option>
          ))}
        </select>
      </label>
      {children}
      <button type="submit" className={cn("btn-primary", size === "lg" && "h-12 px-6")}>
        {button}
      </button>
    </form>
  );
}
