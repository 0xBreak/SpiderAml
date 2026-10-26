"use server";

import type { ReportCategory } from "@/lib/api-types";
import { DataError, limit, sendReport } from "@/lib/data";

export interface ReportState {
  ok: boolean;
  error?: string;
}

const CATEGORIES: ReportCategory[] = ["sanctioned", "exploit", "phishing", "scam", "mixer", "other", "false_positive"];

export async function submitReport(_: ReportState | null, form: FormData): Promise<ReportState> {
  // honeypot: real people never see this field
  if (form.get("website")) return { ok: true };
  const address = String(form.get("address") ?? "").trim();
  const network = String(form.get("network") ?? "ethereum");
  const category = String(form.get("category") ?? "") as ReportCategory;
  const description = String(form.get("description") ?? "").trim();
  const link = String(form.get("link") ?? "").trim() || null;

  if (!/^0x[0-9a-fA-F]{40}$/.test(address) && !/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) return { ok: false, error: "Это не похоже на адрес. Нужен 0x… или T…" };
  if (!CATEGORIES.includes(category)) return { ok: false, error: "Выберите, что случилось." };
  if (description.length < 10) return { ok: false, error: "Опишите ситуацию хотя бы парой предложений." };
  if (description.length > 2000) return { ok: false, error: "Описание слишком длинное (до 2000 символов)." };
  if (link && !/^https:\/\/\S+$/.test(link)) return { ok: false, error: "Ссылка должна начинаться с https://" };

  try {
    await limit("report", 5);
    await sendReport({ address, network, category, description, link });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof DataError ? e.message : "Не удалось отправить. Попробуйте позже." };
  }
}
