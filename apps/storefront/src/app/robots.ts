import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { getStorefrontSiteConfig } from "@/config/storefront-site-config";

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  const site = getStorefrontSiteConfig();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/forms", "/cart", "/thanks"],
      other: {
        "Content-Signal": "search=yes, ai-train=no, ai-input=yes",
      },
    },
    sitemap: `${site.canonicalUrl}/sitemap.xml`,
    host: site.canonicalUrl,
  };
}
