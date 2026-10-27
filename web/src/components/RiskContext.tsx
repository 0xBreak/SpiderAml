import { getTranslations } from "next-intl/server";

/** Plain-words notes on why a token score was adjusted (stablecoin, exchange liquidity, exchange wallets). */
export async function RiskContext({ codes }: { codes?: string[] }) {
  const t = await getTranslations("RiskContext");
  const items = (codes ?? []).filter((c) => t.has(c));
  if (!items.length) return null;
  return (
    <ul className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3 text-sm text-silver-2">
      {items.map((c) => (
        <li key={c}>{t(c)}</li>
      ))}
    </ul>
  );
}
