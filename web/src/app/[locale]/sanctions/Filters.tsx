"use client";

import { useEffect, useState } from "react";
import { parseAsString, useQueryState } from "nuqs";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { CHAIN_NAME } from "@/lib/texts";

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
        placeholder="Адрес или имя из списка"
        className="input font-mono sm:flex-1"
        aria-label="Поиск"
      />
      <select
        defaultValue={initial.chain ?? ""}
        onChange={(e) => {
          void setChain(e.target.value || null);
          void setPage(null);
        }}
        className="input sm:w-48"
        aria-label="Сеть"
      >
        <option value="">Все сети</option>
        {chains.map((c) => (
          <option key={c.chain} value={c.chain}>
            {CHAIN_NAME[c.chain] ?? c.chain} ({c.count})
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
        aria-label="Список"
      >
        <option value="">Все списки</option>
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
        aria-label="Сколько на страницу"
      >
        <option value="10">по 10</option>
        <option value="20">по 20</option>
        <option value="50">по 50</option>
      </select>
    </div>
  );
}
