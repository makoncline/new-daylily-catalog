import {
  CatalogsLoading,
  CatalogsPageClient,
} from "./_components/catalogs-page-client";
import { MainContent } from "../_components/main-content";
import { type Metadata } from "next";
import { getPublicProfiles } from "@/server/db/getPublicProfiles";
import { Suspense } from "react";
import { PageHeader } from "@/app/dashboard/_components/page-header";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { IMAGES } from "@/lib/constants/images";
import { METADATA_CONFIG } from "@/config/constants";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const url = getBaseUrl();
  const pageUrl = `${url}/catalogs`;
  const title = "Browse Daylily Catalogs";
  const description =
    "Discover beautiful daylilies from growers across the country. Browse our curated collection of daylily catalogs featuring rare and popular varieties.";
  const optimizedImage = getOptimizedMetaImageUrl(IMAGES.DEFAULT_CATALOG);

  return {
    title: `${title} | ${METADATA_CONFIG.SITE_NAME}`,
    description,
    metadataBase: new URL(url),
    openGraph: {
      title: `${title} | ${METADATA_CONFIG.SITE_NAME}`,
      description,
      url: pageUrl,
      siteName: METADATA_CONFIG.SITE_NAME,
      locale: METADATA_CONFIG.LOCALE,
      type: "website",
      images: [
        {
          url: optimizedImage,
          width: 1200,
          height: 630,
          alt: "Collection of beautiful daylily catalogs",
        },
      ],
    },
    twitter: {
      card: METADATA_CONFIG.TWITTER_CARD_TYPE,
      title: `${title} | ${METADATA_CONFIG.SITE_NAME}`,
      description,
      site: METADATA_CONFIG.TWITTER_HANDLE,
      images: [optimizedImage],
    },
    other: {
      // CollectionPage JSON-LD for rich results
      "script:ld+json": JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        description,
        url: pageUrl,
        about: {
          "@type": "Thing",
          name: "Daylilies",
          description:
            "Daylilies (Hemerocallis) are flowering plants known for their beautiful blooms and easy care requirements.",
        },
      }),
    },
  };
}

export default async function CatalogsPage() {
  const profiles = await getPublicProfiles();

  return (
    <MainContent>
      <PageHeader
        heading="Daylily Catalogs"
        text="Discover beautiful daylily collections from growers across the country."
      />
      <Suspense fallback={<CatalogsLoading />}>
        <CatalogsPageClient initialProfiles={profiles} />
      </Suspense>
    </MainContent>
  );
}
