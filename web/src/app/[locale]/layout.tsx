import "@fontsource-variable/jetbrains-mono";
import "../globals.css";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ClickTracker } from "@/components/ClickTracker";
import { AppQueryProvider } from "@/components/QueryProvider";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { routing } from "@/i18n/routing";
import { demoEnabled } from "@/lib/demo";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    metadataBase: new URL("https://spideraml.com"),
    title: { default: t("title"), template: "%s · SpiderAML" },
    description: t("description"),
    openGraph: { siteName: "SpiderAML", locale: "ru_RU", type: "website" },
    alternates: { languages: { ru: "/", en: "/en" } },
  };
}

export const viewport: Viewport = { themeColor: "#1f2733" };

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Tell next-intl the locale from the URL segment directly.
  // Without this it resolves the locale via request headers(),
  // which opts every translated route out of static rendering.
  setRequestLocale(locale);
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} className="dark">
      <body className="flex min-h-screen flex-col">
        {/* Explicit locale/messages/timeZone: without them the provider
            infers values from the runtime environment (headers),
            which also breaks static prerendering. timeZone only affects
            next-intl date formatting (unused — format.ts has its own
            Intl instances); Asia/Tashkent matches the current output. */}
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Tashkent">
          <AppQueryProvider>
            <NuqsAdapter>
              <Header locale={locale} />
              <main className="mx-auto w-full max-w-page flex-1 px-4 py-6 sm:py-8">
                {demoEnabled() && <div className="mb-4 border border-warn/50 bg-surface px-3 py-2 text-sm text-warn">Демо-данные: реальный сервис не подключён</div>}
                {children}
              </main>
              <Footer locale={locale} />
              <ClickTracker />
              <Toaster position="bottom-right" theme="dark" toastOptions={{ style: { borderRadius: 0 } }} />
            </NuqsAdapter>
          </AppQueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
