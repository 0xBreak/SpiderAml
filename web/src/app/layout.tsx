import type { Metadata } from "next";

// Pass-through: `<html>` lives in `app/[locale]/layout.tsx` so the
// locale middleware can rewrite `/` to the default locale internally.
// metadataBase stays here so static social images resolve to absolute URLs
// on routes without their own metadata (e.g. `/_not-found`).
export const metadata: Metadata = { metadataBase: new URL("https://spideraml.com") };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
