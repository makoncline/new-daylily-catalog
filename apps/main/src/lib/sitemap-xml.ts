export const CULTIVAR_SITEMAP_PAGE_SIZE = 45_000;
export const PUBLIC_LISTING_SITEMAP_PAGE_SIZE = 45_000;

export interface SitemapUrl {
  url: string;
  lastModified?: Date;
  changeFrequency?: string;
  priority?: number;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function serializeSitemapIndex(urls: string[]) {
  const entries = urls
    .map((url) => `<sitemap><loc>${escapeXml(url)}</loc></sitemap>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</sitemapindex>`;
}

export function serializeSitemapUrls(entries: SitemapUrl[]) {
  const urls = entries
    .map((entry) => {
      const lastModified = entry.lastModified
        ? `<lastmod>${entry.lastModified.toISOString()}</lastmod>`
        : "";
      const changeFrequency = entry.changeFrequency
        ? `<changefreq>${escapeXml(entry.changeFrequency)}</changefreq>`
        : "";
      const priority =
        entry.priority === undefined
          ? ""
          : `<priority>${entry.priority.toFixed(1)}</priority>`;

      return `<url><loc>${escapeXml(entry.url)}</loc>${lastModified}${changeFrequency}${priority}</url>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

export function sitemapXmlResponse(xml: string) {
  return new Response(xml, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Cloudflare-CDN-Cache-Control": "public, max-age=86400",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
