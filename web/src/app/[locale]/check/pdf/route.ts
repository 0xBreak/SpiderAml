// The PDF report of a check. Same input rules and the same per-visitor limit as the check page; the file is built by the data layer.
import { NextResponse } from "next/server";
import { cleanAddressInput, isBitcoinAddress } from "@/lib/action";
import { DataError, getCheckPdf, limit } from "@/lib/data";
import { isNetworkId } from "@/lib/networks";

export const dynamic = "force-dynamic";

const fail = (status: number, code: string) => NextResponse.json({ error: code }, { status, headers: { "cache-control": "no-store" } });

export async function GET(req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const q = new URL(req.url).searchParams;
  const raw = q.get("address");
  const address = raw ? cleanAddressInput(raw).trim() : "";
  const rawNetwork = q.get("network");
  const network = rawNetwork === "tron" || rawNetwork === "bitcoin" ? rawNetwork : rawNetwork && isNetworkId(rawNetwork) ? rawNetwork : "ethereum";
  if (!address || address.length > 100) return fail(400, "INVALID_ADDRESS");
  if (network === "tron" && !/^T\w{33}$/.test(address)) return fail(400, "TRON_EXPECTED");
  if (network === "bitcoin" && !isBitcoinAddress(address)) return fail(400, "BITCOIN_EXPECTED");
  try {
    await limit("pdf", 6);
    const { bytes, id } = await getCheckPdf(address, network, locale === "en" ? "en" : "ru");
    return new NextResponse(bytes, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="spideraml-${address.replace(/[^A-Za-z0-9]/g, "").slice(0, 10)}${/^[\w-]{1,32}$/.test(id) ? `-${id}` : ""}.pdf"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    const err = e instanceof DataError ? e : new DataError("UPSTREAM", "", 500);
    return fail(err.status >= 400 && err.status < 600 ? err.status : 500, err.code);
  }
}
