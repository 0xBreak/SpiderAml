// Two sections that belong together: official sanctions lists and addresses frozen by stablecoin issuers.
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/format";

export async function SanctionsTabs({ active }: { active: "sanctions" | "frozen" }) {
  const t = await getTranslations("Frozen");
  const tabs = [
    { id: "sanctions", href: "/sanctions", label: t("tabSanctions") },
    { id: "frozen", href: "/sanctions/frozen", label: t("tabFrozen") },
  ] as const;
  return (
    <nav aria-label={t("tabsAria")} className="mb-5 flex gap-1 border-b border-line">
      {tabs.map((x) => (
        <Link
          key={x.id}
          href={x.href}
          aria-current={x.id === active ? "page" : undefined}
          className={cn("-mb-px border-b-2 px-4 py-2.5 text-base transition", x.id === active ? "border-accent-from text-silver-1" : "border-transparent text-silver-2 hover:text-silver-1")}
        >
          {x.label}
        </Link>
      ))}
    </nav>
  );
}
