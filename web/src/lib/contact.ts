// How to reach us: the e-mail from the environment (the same variable the footer and the legal pages use) and the Telegram account (the environment, otherwise the official one from socials).
import { SOCIALS } from "./socials";

export const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || undefined;
const handle = process.env.NEXT_PUBLIC_TELEGRAM?.trim().replace(/^@/, "");
export const TELEGRAM_URL = handle ? `https://t.me/${handle}` : SOCIALS.find((s) => s.id === "telegram")?.url;
