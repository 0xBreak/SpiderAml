"use server";

// Crowd reports about risky addresses (form action for useActionState).
// Form-action shape: honeypot → parse with formString → validate → checkLimit → data call → ok (see @/lib/action).
import type { ReportCategory } from "@/lib/api-types";
import { sendReport } from "@/lib/data";
import { trackEvent } from "@/lib/metrics";
import { ERROR_TEXT } from "@/lib/texts";
import { fail, formString, honeypotHit, isAnyAddress, isHttpsUrl, ok, type ActionResult } from "@/lib/action";
import { checkLimit, failFrom } from "@/lib/action-server";

export interface ReportData {
  id?: number;
  token?: string;
}

export type ReportState = ActionResult<ReportData>;

const CATEGORIES: ReportCategory[] = ["sanctioned", "exploit", "phishing", "scam", "mixer", "other", "false_positive"];

export async function submitReport(_prev: ReportState | null, form: FormData): Promise<ReportState> {
  // honeypot: real people never see this field — bots get a fake success with no data
  if (honeypotHit(form)) return ok({});
  const address = formString(form, "address");
  const network = formString(form, "network") || "ethereum";
  const category = formString(form, "category") as ReportCategory;
  const description = formString(form, "description");
  const link = formString(form, "link") || null;

  if (!isAnyAddress(address)) return fail(ERROR_TEXT.INVALID_ADDRESS, "INVALID_ADDRESS");
  if (!CATEGORIES.includes(category)) return fail(ERROR_TEXT.INVALID_CATEGORY, "INVALID_CATEGORY");
  if (description.length < 10) return fail(ERROR_TEXT.DESCRIPTION_SHORT, "DESCRIPTION_SHORT");
  if (description.length > 2000) return fail(ERROR_TEXT.DESCRIPTION_LONG, "DESCRIPTION_LONG");
  if (link && !isHttpsUrl(link)) return fail(ERROR_TEXT.INVALID_LINK, "INVALID_LINK");

  const limited = await checkLimit("report", 5);
  if (limited) return limited;
  try {
    const r = await sendReport({ address, network, category, description, link });
    trackEvent("report", category, "/report", { target: address, network });
    return ok({ id: r.id, token: r.token });
  } catch (e) {
    return failFrom(e);
  }
}
