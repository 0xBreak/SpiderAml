import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/report/status", "/cdn-cgi/"] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
