import { DISCLAIMER } from "@/lib/texts";

const EMAIL = process.env.NEXT_PUBLIC_REPORT_EMAIL ?? "report@spideraml.com";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-page flex-col gap-3 px-4 py-6 text-xs text-silver-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl">{DISCLAIMER}</p>
        <div className="flex shrink-0 items-center gap-4">
          <a className="link" href={`mailto:${EMAIL}?subject=${encodeURIComponent("SpiderAML: ошибка в данных")}`}>
            Сообщить об ошибке
          </a>
          <span>© {new Date().getFullYear()} SpiderAML</span>
        </div>
      </div>
    </footer>
  );
}
