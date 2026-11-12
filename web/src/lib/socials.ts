// Official accounts, shown in the footer and listed in the site's structured data (schema.org sameAs).
// To add one (X, Instagram…): append an entry; an icon for its `id` already exists in components/SocialIcons.tsx.
export interface Social {
  id: "linkedin" | "telegram" | "x" | "instagram";
  label: string;
  url: string;
}

export const SOCIALS: Social[] = [
  { id: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/company/spideraml" },
  { id: "telegram", label: "Telegram channel @spiderAml", url: "https://t.me/spiderAml" },
  { id: "x", label: "X", url: "https://x.com/SpiderAml" },
  { id: "instagram", label: "Instagram", url: "https://www.instagram.com/spideraml" },
];
