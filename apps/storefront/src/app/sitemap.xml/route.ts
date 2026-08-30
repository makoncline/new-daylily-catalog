import { connection } from "next/server";

import {
  PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER,
  PUBLIC_CLOUDFLARE_CACHE_TAG,
} from "@/lib/public-cache-policy";
import { getStorefrontSiteConfig } from "@/config/storefront-site-config";
import { getStorefrontSnapshot } from "@/server/storefront";

const sitemapCacheHeaders = {
  "Cache-Control": "public, max-age=3600",
  [PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER]: "public, max-age=86400",
  "Cache-Tag": PUBLIC_CLOUDFLARE_CACHE_TAG,
  "Content-Type": "application/xml; charset=utf-8",
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

interface SitemapEntry {
  url: string;
  lastModified?: string;
  changeFrequency: string;
  priority: number;
}

function serializeSitemap(entries: readonly SitemapEntry[]) {
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.url)}</loc>${
      entry.lastModified
        ? `\n    <lastmod>${escapeXml(entry.lastModified)}</lastmod>`
        : ""
    }
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>\n`;
}

export async function GET() {
  await connection();
  try {
    const site = getStorefrontSiteConfig();
    const snapshot = await getStorefrontSnapshot(site);
    const absolute = (path: string) =>
      new URL(path, site.canonicalUrl).toString();
    const entries: SitemapEntry[] = [
      { url: absolute("/"), changeFrequency: "weekly", priority: 1 },
      {
        url: absolute("/catalogs"),
        changeFrequency: "daily",
        priority: 0.9,
      },
      {
        url: absolute("/catalog/all"),
        changeFrequency: "daily",
        priority: 0.8,
      },
      {
        url: absolute("/catalog/for-sale"),
        changeFrequency: "daily",
        priority: 0.9,
      },
      {
        url: absolute("/catalog/search"),
        changeFrequency: "weekly",
        priority: 0.7,
      },
      {
        url: absolute("/blog"),
        changeFrequency: "monthly",
        priority: 0.5,
      },
      {
        url: absolute("/blog/dorothy-and-toto"),
        changeFrequency: "yearly",
        priority: 0.5,
      },
      {
        url: absolute("/contact"),
        changeFrequency: "monthly",
        priority: 0.5,
      },
      ...snapshot.lists.map((list) => ({
        url: absolute(`/catalog/${list.slug}`),
        lastModified: list.updatedAt,
        changeFrequency: "daily",
        priority: 0.7,
      })),
      ...snapshot.listings.map((listing) => ({
        url: absolute(`/${listing.slug}`),
        lastModified: listing.updatedAt,
        changeFrequency: "weekly",
        priority: listing.price !== null && listing.price > 0 ? 0.8 : 0.6,
      })),
    ];

    return new Response(serializeSitemap(entries), {
      headers: sitemapCacheHeaders,
    });
  } catch {
    return new Response("Storefront sitemap is unavailable.\n", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        [PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER]: "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
