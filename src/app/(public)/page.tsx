import { type Metadata } from "next";
import HomePageClient from "./_components/home-page-client";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { IMAGES } from "@/lib/constants/images";
import { METADATA_CONFIG } from "@/config/constants";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const url = getBaseUrl();
  const optimizedImage = getOptimizedMetaImageUrl(IMAGES.DEFAULT_META);

  return {
    title: METADATA_CONFIG.DEFAULT_TITLE,
    description: METADATA_CONFIG.DEFAULT_DESCRIPTION,
    keywords: [
      "daylily",
      "hemerocallis",
      "garden catalog",
      "plant database",
      "daylily sales",
      "daylily collection",
    ],
    metadataBase: new URL(url),
    openGraph: {
      title: METADATA_CONFIG.DEFAULT_TITLE,
      description: METADATA_CONFIG.DEFAULT_DESCRIPTION,
      url,
      siteName: METADATA_CONFIG.SITE_NAME,
      locale: METADATA_CONFIG.LOCALE,
      type: "website",
      images: [
        {
          url: optimizedImage,
          width: 1200,
          height: 630,
          alt: "Beautiful daylily garden at golden hour",
        },
      ],
    },
    twitter: {
      card: METADATA_CONFIG.TWITTER_CARD_TYPE,
      title: METADATA_CONFIG.DEFAULT_TITLE,
      description: METADATA_CONFIG.DEFAULT_DESCRIPTION,
      site: METADATA_CONFIG.TWITTER_HANDLE,
      images: [optimizedImage],
    },
    other: {
      // WebSite JSON-LD for rich results
      "script:ld+json": JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: METADATA_CONFIG.SITE_NAME,
        description: METADATA_CONFIG.DEFAULT_DESCRIPTION,
        url,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${url}/catalogs?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
        // Add SoftwareApplication schema for app features
        application: {
          "@type": "SoftwareApplication",
          name: METADATA_CONFIG.SITE_NAME,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          featureList: [
            "Auto-populate listings from 100,000+ registered cultivars",
            "Professional photo galleries",
            "Custom collection organization",
            "Garden profile and bio",
            "Official cultivar database access",
          ],
        },
      }),
    },
  };
}

export default async function HomePage() {
  return <HomePageClient />;
}
