import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

/** Crawlers that take the content for training or copy it wholesale: no benefit to a free tool, a lot of load. Search engines and link previews are not in this list. */
const GREEDY = [
  "GPTBot", "ClaudeBot", "anthropic-ai", "CCBot", "Bytespider", "Amazonbot", "meta-externalagent", "PetalBot", "DotBot", "MJ12bot", "AhrefsBot", "SemrushBot",
  "DataForSeoBot", "ImagesiftBot", "Applebot-Extended", "cohere-ai", "PerplexityBot", "omgili", "Diffbot", "Timpibot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: GREEDY, disallow: "/" },
      // every parameterised URL runs a real check or a database query: a crawler gets the static pages only
      { userAgent: "*", allow: "/", disallow: ["/api/", "/report/status", "/cdn-cgi/", "/*?address=", "/*?q=", "/*?page=", "/*?network=", "/check/pdf", "/en/check/pdf"], crawlDelay: 10 },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
