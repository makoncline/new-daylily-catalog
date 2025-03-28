import { IMAGES } from "@/lib/constants/images";
import { unstable_cache } from "next/cache";
import { METADATA_CONFIG } from "@/config/constants";

// Base function for generating metadata
async function createHomePageMetadata(url: string) {
  const title = METADATA_CONFIG.SITE_NAME;
  const description =
    "Discover beautiful daylilies from growers across the country. Browse our collection of registered cultivars and connect with daylily enthusiasts.";
  const imageUrl = IMAGES.DEFAULT_META;

  return {
    url,
    title,
    description,
    imageUrl,
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

// Cached function to generate home page metadata
export function generateHomePageMetadata(url: string) {
  return unstable_cache(
    async () => createHomePageMetadata(url),
    ["home-page-metadata"],
    { revalidate: 3600 },
  )();
}
