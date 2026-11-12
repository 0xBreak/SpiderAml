// How to reach the owner: the e-mail from the environment (the same variable the footer and the legal pages use) and the personal Telegram profile.
// The channel @spiderAml is NOT a contact: it is listed in socials.ts as the channel.
export const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || undefined;
export const TELEGRAM_HANDLE = "OxBreak";
export const TELEGRAM_URL = `https://t.me/${TELEGRAM_HANDLE}`;
