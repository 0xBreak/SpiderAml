"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { parseAsString, useQueryState } from "nuqs";
import { useDebouncedValue } from "@/lib/use-debounced-value";

/** Live filters for the sanctions list. Typing updates ?q= (debounced),
 * selects update ?chain= / ?list= immediately; changing any filter resets ?page=. */
export function SanctionsFilters({
  initial,
  chains,
  lists,
}: {
  initial: { q?: string; chain?: string; list?: string };
  chains: { chain: string; count: number }[];
  lists: { list: string; count: number }[];
}) {
  const t = useTranslations("Sanctions");
  const tChain = useTranslations("Chain");
  const [q, setQ] = useState(initial.q ?? "");
  const [, setParamQ] = useQueryState("q", parseAsString.withOptions({ history: "replace", shallow: false }));
  const [, setChain] = useQueryState("chain", parseAsString.withOptions({ history: "replace", shallow: false }));
  const [, setList] = useQueryState("list", parseAsString.withOptions({ history: "replace", shallow: false }));
  const [pageSize, setPageSize] = useQueryState("pageSize", parseAsString.withDefault("10").withOptions({ history: "replace", shallow: false }));
  const [, setPage] = useQueryState("page", parseAsString.withOptions({ history: "replace", shallow: false }));
  const debouncedQ = useDebouncedValue(q, 400);

  useEffect(() => {
    const v = debouncedQ.trim();
    if ((v || undefined) !== (initial.q || undefined)) {
      void setParamQ(v || null);
      void setPage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row" role="search">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        maxLength={100}
        placeholder={t("searchPlaceholder")}
        className="input font-mono sm:flex-1"
        aria-label={t("search")}
      />
      <select
        defaultValue={initial.chain ?? ""}
        onChange={(e) => {
          void setChain(e.target.value || null);
          void setPage(null);
        }}
        className="input sm:w-48"
        aria-label={t("network")}
      >
        <option value="">{t("allNetworks")}</option>
        {chains.map((c) => (
          <option key={c.chain} value={c.chain}>
            {tChain.has(c.chain) ? tChain(c.chain) : c.chain} ({c.count})
          </option>
        ))}
      </select>
      <select
        defaultValue={initial.list ?? ""}
        onChange={(e) => {
          void setList(e.target.value || null);
          void setPage(null);
        }}
        className="input sm:w-48"
        aria-label={t("list")}
      >
        <option value="">{t("allLists")}</option>
        {lists.map((l) => (
          <option key={l.list} value={l.list}>
            {l.list} ({l.count})
          </option>
        ))}
      </select>
      <select
        value={pageSize}
        onChange={(e) => {
          const v = e.target.value;
          void setPageSize(v === "10" ? null : v);
          void setPage(null);
        }}
        className="input sm:w-36"
        aria-label={t("perPage")}
      >
        <option value="10">{t("per10")}</option>
        <option value="20">{t("per20")}</option>
        <option value="50">{t("per50")}</option>
      </select>
    </div>
  );
}
