// Request headers that tell apart people behind one address (an office, a mobile carrier): the language of the browser and the platform.
// They are sent to the data layer only to be mixed into the salted visitor hash; nothing here is stored or shown.
export function visitorHints(h: { get(name: string): string | null }): string {
  const lang = (h.get("accept-language") ?? "").toLowerCase().replace(/\s+/g, "").slice(0, 80);
  const platform = (h.get("sec-ch-ua-platform") ?? "").replace(/"/g, "").toLowerCase().slice(0, 20);
  const mobile = (h.get("sec-ch-ua-mobile") ?? "").slice(0, 4);
  return lang || platform || mobile ? `${lang}|${platform}|${mobile}` : "";
}
