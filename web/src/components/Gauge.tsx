// Half-circle score gauge, 0–100. Pure SVG.
import { useTranslations } from "next-intl";
const COLOR = { ok: "#3DDC97", warn: "#FFB04A", crit: "#FF5A4A" } as const;

export function Gauge({ score, tone }: { score: number; tone: keyof typeof COLOR }) {
  const t = useTranslations("Ui");
  const r = 52;
  const len = Math.PI * r;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * len;
  return (
    <svg viewBox="0 0 128 76" className="w-40" role="img" aria-label={t("gaugeLabel", { score })}>
      <path d="M12 68 A52 52 0 0 1 116 68" fill="none" stroke="#2A3448" strokeWidth="10" strokeLinecap="round" />
      <path d="M12 68 A52 52 0 0 1 116 68" fill="none" stroke={COLOR[tone]} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${filled} ${len}`} />
      <text x="64" y="62" textAnchor="middle" fill="#F3F6FB" fontSize="26" fontWeight="700" fontFamily="Inter Variable, sans-serif">
        {score}
      </text>
      <text x="64" y="74" textAnchor="middle" fill="#6D7787" fontSize="8" fontFamily="Inter Variable, sans-serif">
        {t("of100")}
      </text>
    </svg>
  );
}
