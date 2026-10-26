import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://spideraml.com"),
  title: { default: "SpiderAML — проверка крипто-адресов", template: "%s · SpiderAML" },
  description: "Проверьте криптоадрес перед переводом: санкционные списки, взломы, фишинг, подозрительная активность. Анализ токенов и крупных переводов.",
  openGraph: { siteName: "SpiderAML", locale: "ru_RU", type: "website" },
};

export const viewport: Viewport = { themeColor: "#070B14" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-page flex-1 px-4 py-6 sm:py-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
