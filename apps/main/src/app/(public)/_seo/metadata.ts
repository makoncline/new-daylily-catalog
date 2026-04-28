import { IMAGES } from "@/lib/constants/images";
import { METADATA_CONFIG } from "@/config/constants";
import { buildPublicPageMetadata, type PublicPageMetadata } from "./public-seo";

// Base function for generating metadata
async function createHomePageMetadata(url: string): Promise<PublicPageMetadata> {
  const description =
    "Discover beautiful daylilies from growers across the country. Browse our collection of registered cultivars and connect with daylily enthusiasts.";
  const imageUrl = IMAGES.DEFAULT_META;

  return buildPublicPageMetadata({
    canonicalPath: "/",
    description,
    imageAlt: "Beautiful daylily garden at golden hour",
    imageUrl,
    keywords: [
      "daylily catalog",
      "daylily database",
      "daylily growers",
      "daylily listings",
      "garden catalog",
    ],
    metadataBase: new URL(url),
    pageUrl: url,
    title: METADATA_CONFIG.SITE_NAME,
  });
}

export function generateHomePageMetadata(url: string) {
  return createHomePageMetadata(url);
}
