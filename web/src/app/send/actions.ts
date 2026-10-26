"use server";

// Off-chain screening of a recipient for the send page. Returns only what the page shows, not the full report.
import { DataError, getCheck, limit } from "@/lib/data";
import { trackEvent } from "@/lib/metrics";
import { CATEGORY, LEVEL } from "@/lib/texts";

export interface Screening {
  ok: boolean;
  level?: keyof typeof LEVEL;
  score?: number;
  title?: string;
  reasons?: string[];
  sanctioned?: boolean;
  error?: string;
}

export async function screenRecipient(address: string): Promise<Screening> {
  if (typeof address !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(address)) return { ok: false, error: "INVALID_ADDRESS" };
  try {
    await limit("screen", 30);
    const r = await getCheck(address, "arbitrum");
    trackEvent("send_screen", r.level, "/send");
    const reasons = [...new Set(r.findings.map((f) => CATEGORY[f.category]?.name ?? f.category))];
    return { ok: true, level: r.level, score: r.score, title: LEVEL[r.level].title, reasons, sanctioned: r.sanctions.length > 0 };
  } catch (e) {
    return { ok: false, error: e instanceof DataError ? e.code : "UPSTREAM" };
  }
}
