import { type Metadata } from "next";
import HomePageClient from "./_components/home-page-client";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { IMAGES } from "@/lib/constants/images";
import { METADATA_CONFIG } from "@/config/constants";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";
import { generateHomePageMetadata } from "./_seo/metadata";
import { generateWebsiteJsonLd } from "./_seo/json-ld";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const url = getBaseUrl();

  // Generate metadata
  const metadata = await generateHomePageMetadata(url);

  return {
    title: metadata.title,
    description: metadata.description,
    keywords: metadata.keywords,
    metadataBase: new URL(url),
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      url,
      siteName: METADATA_CONFIG.SITE_NAME,
      locale: METADATA_CONFIG.LOCALE,
      type: "website",
      images: [
        {
          url: metadata.imageUrl,
          width: 1200,
          height: 630,
          alt: "Beautiful daylily garden at golden hour",
        },
      ],
    },
    twitter: {
      card: METADATA_CONFIG.TWITTER_CARD_TYPE,
      title: metadata.title,
      description: metadata.description,
      site: METADATA_CONFIG.TWITTER_HANDLE,
      images: [metadata.imageUrl],
    },
    // Remove JSON-LD from metadata - it will be added as a script tag
  };
}

export default async function HomePage() {
  // Generate metadata and JSON-LD
  const baseUrl = getBaseUrl();
  const metadata = await generateHomePageMetadata(baseUrl);
  const jsonLd = await generateWebsiteJsonLd(metadata);

  return (
    <>
      {/* Add JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePageClient />
    </>
  );
}
