// Server-only client for the private data layer. The secret never leaves the server; the browser only gets HTML.
import "server-only";
import { headers } from "next/headers";
import type { ApiErrorBody, SectionMap, SectionName, WhaleReport } from "./types";
import type { FrozenPage, CheckReport, LabelMap, MarketsData, MetaInfo, ReportCategory, RequestsInfo, SanctionsPage } from "./api-types";
import { demoCall, demoEnabled } from "./demo";
import { clientIp } from "./ip";

export class DataError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const URL_ = process.env.DATA_URL ?? "http://127.0.0.1:8787";
const SECRET = process.env.DATA_SECRET ?? "";

async function call<T>(path: string, params: Record<string, string | number | undefined>, timeoutMs = 60_000, body?: unknown, revalidate?: number): Promise<T> {
  // No data layer in local dev (or DATA_DEMO=1): render the real pages with generated data.
  if (demoEnabled()) return demoCall(path, params, body) as T;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  let res: Response;
  try {
    res = await fetch(`${URL_}${path}?${qs}`, {
      method: body ? "POST" : "GET",
      body: body ? JSON.stringify(body) : undefined,
      headers: { "x-spider-key": SECRET, ...(body ? { "content-type": "application/json" } : {}) },
      // Site stats change when the data layer refreshes its lists (every 6h),
      // so the homepage may cache them; everything else stays per-request.
      ...(revalidate != null ? { next: { revalidate } } : { cache: "no-store" }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new DataError("UNAVAILABLE", "Сервис данных временно недоступен.", 503);
  }
  const out = (await res.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!res.ok || !out) {
    const e = (out as ApiErrorBody | null)?.error;
    throw new DataError(e?.code ?? "UPSTREAM", e?.message ?? "Ошибка сервиса данных.", res.status);
  }
  return out as T;
}

// ---------------------------------------------------------------- per-IP limit for the expensive pages

const hits = new Map<string, number[]>();

/** Sliding one-minute window per client IP. Throws a DataError the page renders like any other error. */
export async function limit(bucket: string, perMinute: number) {
  if (demoEnabled()) return;
  const h = await headers();
  const key = `${bucket}:${clientIp(h)}`;
  const now = Date.now();
  const tooMany = () => new DataError("RATE_LIMITED", "Слишком много запросов. Подождите минуту.", 429);
  // 1. the person's own limit first: a refused request must not use up the shared ceiling
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= perMinute) throw tooMany();
  // 2. a ceiling for the whole site: a crawler that comes from a thousand addresses is stopped by the sum, not by its parts.
  // It is generous (20 times the personal limit) so that a mention in a chat or a post does not lock out real visitors.
  const all = (hits.get(`all:${bucket}`) ?? []).filter((x) => now - x < 60_000);
  if (all.length >= perMinute * 20) throw tooMany();
  recent.push(now);
  hits.set(key, recent);
  all.push(now);
  hits.set(`all:${bucket}`, all);
  // clean up at most twice a minute, whatever the size: a map of thousands of idle keys must not be walked on every request
  if (now - lastSweep > 30_000) {
    lastSweep = now;
    for (const [k, v] of hits) if (v.every((t) => now - t >= 60_000)) hits.delete(k);
  }
}
let lastSweep = 0;

// ---------------------------------------------------------------- endpoints

export const getCheck = (address: string, network: string) => call<CheckReport>("/v1/check", { address, network });

/** The detailed report as a PDF. The data layer makes the check again (its caches keep this cheap) and draws the file. */
export async function getCheckPdf(address: string, network: string, lang: "ru" | "en"): Promise<{ bytes: ArrayBuffer; id: string }> {
  if (demoEnabled()) throw new DataError("UNAVAILABLE", "The PDF report needs the data layer.", 503);
  let res: Response;
  try {
    res = await fetch(`${URL_}/v1/check/pdf?${new URLSearchParams({ address, network, lang })}`, { headers: { "x-spider-key": SECRET }, cache: "no-store", signal: AbortSignal.timeout(90_000) });
  } catch {
    throw new DataError("UNAVAILABLE", "Сервис данных временно недоступен.", 503);
  }
  if (!res.ok) {
    const out = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new DataError(out?.error?.code ?? "UPSTREAM", out?.error?.message ?? "Ошибка сервиса данных.", res.status);
  }
  return { bytes: await res.arrayBuffer(), id: res.headers.get("x-report-id") ?? "" };
}

export const getSection = <K extends SectionName>(name: K, address: string, network: string, extra: Record<string, string | number> = {}) =>
  call<SectionMap[K] & { labels?: LabelMap }>("/v1/aml", { address, network, section: name, ...extra });

export const getWhales = (address: string, network: string, whaleUsd: number, window: string) =>
  call<WhaleReport & { labels: LabelMap }>("/v1/whales", { address, network, whaleUsd, window }, 90_000);

/** The newest freezes for the home page, kept for ten minutes (they change a few times a day). */
export const getLatestFrozen = (revalidate = 600) => call<FrozenPage>("/v1/frozen", { page: 1, pageSize: 40 }, 10_000, undefined, revalidate);

export const getFrozen = (p: { q?: string; chain?: string; asset?: string; page?: number; pageSize?: number }) => call<FrozenPage>("/v1/frozen", p);

export const getSanctions = (p: { q?: string; chain?: string; list?: string; page?: number; pageSize?: number }) => call<SanctionsPage>("/v1/sanctions", p);

/** The request counter on the home page: kept for 15 seconds on the website (and 2 seconds in the data layer), so a new request shows up within about 15 seconds. */
export const getRequests = (revalidate = 15) => call<RequestsInfo>("/v1/requests", {}, 5_000, undefined, revalidate);

export const getMeta = (revalidate?: number) => call<MetaInfo>("/v1/meta", {}, 10_000, undefined, revalidate);

export const getMarkets = (address: string, network: string) => call<{ markets: MarketsData | null; listed?: { network: string; symbol: string }[] }>("/v1/markets", { address, network }, 30_000);

export const sendReport = (r: { address: string; network: string; category: ReportCategory; description: string; link: string | null }) =>
  call<{ ok: boolean; id: number; token: string }>("/v1/reports", {}, 10_000, r);

export interface ReportStatusInfo {
  id: number;
  address: string;
  network: string;
  category: string;
  status: "new" | "reviewing" | "confirmed" | "rejected";
  reply: string | null;
  createdAt: number;
  updatedAt: number | null;
}

export const getReportStatus = (id: string, t: string) => call<ReportStatusInfo>("/v1/reports/status", { id, t }, 10_000);
