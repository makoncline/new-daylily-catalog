import { IMAGES } from "@/lib/constants/images";
import { METADATA_CONFIG } from "@/config/constants";

// Base function for generating metadata
async function createHomePageMetadata(url: string) {
  const title = METADATA_CONFIG.SITE_NAME;
  const description =
    "Search daylily cultivars, browse public grower catalogs, and discover sellers through a daylily database built for research and marketplace discovery.";
  const imageUrl = IMAGES.DEFAULT_META;

  return {
    url,
    title,
    description,
    imageUrl,
    robots: "index, follow, max-image-preview:large",
    keywords: [
      "daylily catalog",
      "daylily database",
      "daylily growers",
      "daylily listings",
      "garden catalog",
    ],
    openGraph: {
      title,
      description,
      url,
      siteName: METADATA_CONFIG.SITE_NAME,
      locale: METADATA_CONFIG.LOCALE,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "Beautiful daylily garden at golden hour",
        },
      ],
      type: "website",
    },
    twitter: {
      card: METADATA_CONFIG.TWITTER_CARD_TYPE,
      title,
      description,
      site: METADATA_CONFIG.TWITTER_HANDLE,
      images: [imageUrl],
    },
    alternates: {
      canonical: "/",
    },
  };
}

export function generateHomePageMetadata(url: string) {
  return createHomePageMetadata(url);
}
