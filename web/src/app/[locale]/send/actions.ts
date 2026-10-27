"use server";

// Off-chain screening of a recipient for the send page. Returns only what the page shows, not the full report.
// Query-action shape: validate → checkLimit → data call → trackEvent → ok/fail (see @/lib/action templates).
import { getCheck } from "@/lib/data";
import { trackEvent } from "@/lib/metrics";
import { CATEGORY, LEVEL } from "@/lib/texts";
import { failCode, isEvmAddress, ok, type ActionResult } from "@/lib/action";
import { checkLimit, failFrom } from "@/lib/action-server";

export interface ScreeningData {
  level: keyof typeof LEVEL;
  score: number;
  title: string;
  reasons: string[];
  sanctioned: boolean;
}

export type Screening = ActionResult<ScreeningData>;

export async function screenRecipient(address: string): Promise<Screening> {
  if (!isEvmAddress(address)) return failCode("INVALID_ADDRESS");
  const limited = await checkLimit("screen", 30);
  if (limited) return limited;
  try {
    const r = await getCheck(address.trim(), "arbitrum");
    trackEvent("send_screen", r.level, "/send");
    const reasons = [...new Set(r.findings.map((f) => CATEGORY[f.category]?.name ?? f.category))];
    return ok({ level: r.level, score: r.score, title: LEVEL[r.level].title, reasons, sanctioned: r.sanctions.length > 0 });
  } catch (e) {
    return failFrom(e);
  }
}
