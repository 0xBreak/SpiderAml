"use client";

import { useMemo, useState } from "react";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type SortingState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Addr } from "@/components/Addr";
import { Badge, toneOfSeverity } from "@/components/ui";
import { cn, usd } from "@/lib/format";
import type { Locale } from "@/i18n/routing";
import type { Category } from "@/lib/api-types";
import type { HolderKind } from "@/lib/types";

export interface WhaleWallet {
  address: string;
  label: string | null;
  kind: HolderKind;
  inUsd: number | null;
  outUsd: number | null;
  netUsd: number | null;
}

export interface WhaleLabel {
  severity: number;
  category: Category;
  label: string;
}

function SortIcon({ dir }: { dir: "asc" | "desc" | false }) {
  if (dir === "asc") return <ArrowUp className="size-4" aria-hidden />;
  if (dir === "desc") return <ArrowDown className="size-4" aria-hidden />;
  return <ArrowUpDown className="size-4 opacity-50" aria-hidden />;
}

/** Whale wallets with sortable Received / Sent / Net columns. */
export function WhalesTable({ wallets, labels, explorer }: { wallets: WhaleWallet[]; labels: Record<string, WhaleLabel>; explorer: string }) {
  const t = useTranslations("Whales");
  const tKind = useTranslations("Holder");
  const tCat = useTranslations("Category");
  const locale = useLocale() as Locale;
  const [sorting, setSorting] = useState<SortingState>([{ id: "net", desc: true }]);
  const table = useReactTable({
    data: useMemo(() => wallets, [wallets]),
    columns: useMemo(
      () => [
        {
          id: "wallet",
          header: t("colWallet"),
          accessorFn: (w: WhaleWallet) => w.address,
          cell: ({ row }: { row: { original: WhaleWallet } }) => (
            <Addr value={row.original.address} href={`${explorer}/address/${row.original.address}`} className="text-base text-silver-1" />
          ),
          enableSorting: false,
        },
        {
          id: "who",
          header: t("colWho"),
          accessorFn: (w: WhaleWallet) => w.label ?? tKind(w.kind),
          cell: ({ row }: { row: { original: WhaleWallet } }) => {
            const w = row.original;
            const tag = labels[w.address.toLowerCase()];
            return (
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-silver-1">{w.label ?? (tag?.severity === 0 ? tag.label : tKind(w.kind))}</span>
                {tag && tag.severity > 0 && <Badge tone={toneOfSeverity(tag.severity)}>{tCat.has(tag.category) ? tCat(`${tag.category}.name`) : tag.category}</Badge>}
              </span>
            );
          },
          enableSorting: false,
        },
        {
          id: "in",
          header: t("colIn"),
          accessorFn: (w: WhaleWallet) => w.inUsd ?? -1,
          cell: ({ getValue }: { getValue: () => number }) => {
            const v = getValue();
            return <span className={cn("tabular-nums", v < 0 ? "text-silver-3" : "text-ok")}>{v < 0 ? "—" : usd(v, true, locale)}</span>;
          },
          meta: { align: "right" as const },
        },
        {
          id: "out",
          header: t("colOut"),
          accessorFn: (w: WhaleWallet) => w.outUsd ?? -1,
          cell: ({ getValue }: { getValue: () => number }) => {
            const v = getValue();
            return <span className={cn("tabular-nums", v < 0 ? "text-silver-3" : "text-crit")}>{v < 0 ? "—" : usd(v, true, locale)}</span>;
          },
          meta: { align: "right" as const },
        },
        {
          id: "net",
          header: t("colNet"),
          accessorFn: (w: WhaleWallet) => w.netUsd ?? 0,
          cell: ({ getValue }: { getValue: () => number }) => {
            const v = getValue();
            return <span className={cn("font-semibold tabular-nums", v >= 0 ? "text-ok" : "text-crit")}>{usd(v, true, locale)}</span>;
          },
          meta: { align: "right" as const },
        },
      ],
      [explorer, labels, t, tKind, tCat, locale],
    ),
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="-mx-4 overflow-x-auto sm:-mx-5">
      <table className="w-full min-w-[680px] border-collapse text-left text-base">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => {
                const align = (h.column.columnDef.meta as { align?: string } | undefined)?.align;
                const sorted = h.column.getIsSorted();
                const sortable = h.column.getCanSort();
                return (
                  <th
                    key={h.id}
                    aria-sort={sortable ? (sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none") : undefined}
                    className={cn(
                      "whitespace-nowrap border-b border-line px-3 py-3 text-sm font-medium text-silver-2 first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5",
                      align === "right" && "text-right",
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        className={cn(
                          "inline-flex items-center gap-1.5 transition-colors hover:text-silver-1",
                          align === "right" && "flex-row-reverse",
                        )}
                        aria-label={t("sortBy", { column: typeof h.column.columnDef.header === "string" ? h.column.columnDef.header : "" })}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <SortIcon dir={sorted} />
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.original.address} className="border-b border-line/40 transition-colors last:border-0 hover:bg-surface-2/30">
              {row.getVisibleCells().map((cell) => {
                const numeric = cell.column.id === "in" || cell.column.id === "out" || cell.column.id === "net";
                return (
                  <td
                    key={cell.id}
                    className={cn("px-3 py-3.5 align-middle first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5", numeric && "whitespace-nowrap text-right")}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
