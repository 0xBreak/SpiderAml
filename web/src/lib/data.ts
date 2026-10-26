// Server-only client for the private data layer. The secret never leaves the server; the browser only gets HTML.
import "server-only";
import { headers } from "next/headers";
import type { ApiErrorBody, SectionMap, SectionName, WhaleReport } from "./types";
import type { CheckReport, LabelMap, MetaInfo, SanctionsPage } from "./api-types";

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

async function call<T>(path: string, params: Record<string, string | number | undefined>, timeoutMs = 60_000): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  let res: Response;
  try {
    res = await fetch(`${URL_}${path}?${qs}`, {
      headers: { "x-spider-key": SECRET },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new DataError("UNAVAILABLE", "Сервис данных временно недоступен.", 503);
  }
  const body = (await res.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!res.ok || !body) {
    const e = (body as ApiErrorBody | null)?.error;
    throw new DataError(e?.code ?? "UPSTREAM", e?.message ?? "Ошибка сервиса данных.", res.status);
  }
  return body as T;
}

// ---------------------------------------------------------------- per-IP limit for the expensive pages

const hits = new Map<string, number[]>();

/** Sliding one-minute window per client IP. Throws a DataError the page renders like any other error. */
export async function limit(bucket: string, perMinute: number) {
  const h = await headers();
  const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= perMinute) throw new DataError("RATE_LIMITED", "Слишком много запросов. Подождите минуту.", 429);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= 60_000)) hits.delete(k);
}

// ---------------------------------------------------------------- endpoints

export const getCheck = (address: string, network: string) => call<CheckReport>("/v1/check", { address, network });

export const getSection = <K extends SectionName>(name: K, address: string, network: string, extra: Record<string, string | number> = {}) =>
  call<SectionMap[K] & { labels?: LabelMap }>("/v1/aml", { address, network, section: name, ...extra });

export const getWhales = (address: string, network: string, whaleUsd: number, window: string) =>
  call<WhaleReport & { labels: LabelMap }>("/v1/whales", { address, network, whaleUsd, window }, 90_000);

export const getSanctions = (p: { q?: string; chain?: string; list?: string; page?: number }) => call<SanctionsPage>("/v1/sanctions", p);

export const getMeta = () => call<MetaInfo>("/v1/meta", {}, 10_000);
