"use client";

import { useMemo, useState } from "react";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type SortingState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from "lucide-react";
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
  /** the wallet's biggest transfer above the threshold (hash and size), for a link to the transaction */
  largestTx?: string | null;
  largestUsd?: number | null;
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
export function WhalesTable({ wallets: all, labels, explorer }: { wallets: WhaleWallet[]; labels: Record<string, WhaleLabel>; explorer: string }) {
  const t = useTranslations("Whales");
  const tKind = useTranslations("Holder");
  const tCat = useTranslations("Category");
  const locale = useLocale() as Locale;
  const [sorting, setSorting] = useState<SortingState>([{ id: "net", desc: true }]);
  // people first: routers and pools are contracts, not whales. The default tab is the one with wallets in it.
  const isPerson = (w: WhaleWallet) => w.kind === "eoa" || w.kind === "multisig";
  const people = useMemo(() => all.filter(isPerson), [all]);
  const infra = useMemo(() => all.filter((w) => !isPerson(w)), [all]);
  const [tab, setTab] = useState<"wallets" | "contracts" | "all">(people.length > 0 ? "wallets" : "all");
  const wallets = useMemo(() => (tab === "wallets" ? people : tab === "contracts" ? infra : all).slice(0, 50), [tab, people, infra, all]);
  const table = useReactTable({
    data: useMemo(() => wallets, [wallets]),
    columns: useMemo(
      () => [
        {
          id: "wallet",
          header: t("colWallet"),
          accessorFn: (w: WhaleWallet) => w.address,
          cell: ({ row }: { row: { original: WhaleWallet } }) => (
            // the link here opens the address page; the transaction has its own column
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
          id: "largest",
          header: t("colLargest"),
          accessorFn: (w: WhaleWallet) => w.largestUsd ?? -1,
          cell: ({ row }: { row: { original: WhaleWallet } }) => {
            const w = row.original;
            if (!w.largestTx || w.largestUsd == null) return <span className="text-silver-3">—</span>;
            const base = explorer.replace(/\/address\/.*$/, "");
            return (
              <a href={`${base}/tx/${w.largestTx}`} target="_blank" rel="noopener noreferrer" title={t("txOnExplorer")} className="inline-flex items-center gap-1.5 tabular-nums text-silver-1 hover:text-accent">
                {usd(w.largestUsd, true, locale)} <ExternalLink className="size-3.5" aria-hidden />
              </a>
            );
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

  const chip = (id: "wallets" | "contracts" | "all", label: string, n: number) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      aria-pressed={tab === id}
      className={cn("h-9 border px-3 text-sm transition", tab === id ? "border-accent bg-accent/10 text-silver-1" : "border-line text-silver-2 hover:text-silver-1")}
    >
      {label} <span className="tabular-nums text-silver-3">{n}</span>
    </button>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {chip("wallets", t("tabWallets"), people.length)}
        {chip("contracts", t("tabContracts"), infra.length)}
        {chip("all", t("tabAll"), all.length)}
      </div>
      <p className="mb-4 text-sm text-silver-2">{t("netHint")}</p>
      {wallets.length === 0 && <p className="py-6 text-base text-silver-2">{t("tabEmpty")}</p>}
    <div className="-mx-4 overflow-x-auto sm:-mx-5">
      <table className="w-full min-w-[760px] border-collapse text-left text-base">
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
                const numeric = ["in", "out", "net", "largest"].includes(cell.column.id);
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
    </div>
  );
}
