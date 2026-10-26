// Click beacon from the browser: { label, path }. Write-only, tiny, rate-limited; forwarded to the data layer.
import { NextResponse, type NextRequest } from "next/server";
import { trackEvent } from "@/lib/metrics";

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => null)) as { label?: unknown; path?: unknown } | null;
  if (!b || typeof b.label !== "string" || typeof b.path !== "string" || b.label.length > 80 || b.path.length > 200 || !/^[\w\-:./ а-яё]+$/i.test(b.label))
    return new NextResponse(null, { status: 204 });
  await trackEvent("click", b.label, b.path);
  return new NextResponse(null, { status: 204 });
}
