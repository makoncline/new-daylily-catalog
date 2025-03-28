import { MainContent } from "../_components/main-content";
import { type Metadata } from "next";
import { getPublicProfiles } from "@/server/db/getPublicProfiles";
import { Suspense } from "react";
import { PageHeader } from "@/app/dashboard/_components/page-header";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { METADATA_CONFIG } from "@/config/constants";
import {
  CatalogsSkeleton,
  CatalogsPageClient,
} from "./_components/catalogs-page-client";
import { generateCatalogsPageMetadata } from "./_seo/metadata";
import {
  createBreadcrumbListSchema,
  createCatalogsBreadcrumbs,
} from "@/lib/utils/breadcrumbs";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const url = getBaseUrl();

  // Generate metadata
  const metadata = await generateCatalogsPageMetadata(url);

  return {
    title: `${metadata.title} | ${METADATA_CONFIG.SITE_NAME}`,
    description: metadata.description,
    metadataBase: new URL(url),
    openGraph: {
      title: `${metadata.title} | ${METADATA_CONFIG.SITE_NAME}`,
      description: metadata.description,
      url: metadata.pageUrl,
      siteName: METADATA_CONFIG.SITE_NAME,
      locale: METADATA_CONFIG.LOCALE,
      type: "website",
      images: [
        {
          url: metadata.imageUrl,
          width: 1200,
          height: 630,
          alt: "Collection of beautiful daylily catalogs",
        },
      ],
    },
    twitter: {
      card: METADATA_CONFIG.TWITTER_CARD_TYPE,
      title: `${metadata.title} | ${METADATA_CONFIG.SITE_NAME}`,
      description: metadata.description,
      site: METADATA_CONFIG.TWITTER_HANDLE,
      images: [metadata.imageUrl],
    },
  };
}

export default async function CatalogsPage() {
  const catalogs = await getPublicProfiles();

  // Generate metadata
  const baseUrl = getBaseUrl();
  const metadata = await generateCatalogsPageMetadata(baseUrl);

  // Create breadcrumb schema
  const breadcrumbSchema = createBreadcrumbListSchema(
    baseUrl,
    createCatalogsBreadcrumbs(baseUrl),
  );

  return (
    <MainContent>
      {/* Add breadcrumb schema - keeping only what works for rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <PageHeader
        heading="Daylily Catalogs"
        text="Discover beautiful daylily collections from growers across the country."
      />
      <Suspense fallback={<CatalogsSkeleton />}>
        <CatalogsPageClient catalogs={catalogs} />
      </Suspense>
    </MainContent>
  );
}
