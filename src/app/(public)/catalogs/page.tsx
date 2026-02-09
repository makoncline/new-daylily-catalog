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
    robots: "index, follow, max-image-preview:large",
    alternates: {
      canonical: "/catalogs",
    },
  };
}

export default async function CatalogsPage() {
  const catalogs = await getPublicProfiles();

  const baseUrl = getBaseUrl();
  const catalogsUrl = `${baseUrl}/catalogs`;

  // Create breadcrumb schema
  const breadcrumbSchema = createBreadcrumbListSchema(
    baseUrl,
    createCatalogsBreadcrumbs(baseUrl),
  );

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Daylily Catalogs",
    description:
      "Browse public daylily grower catalogs and discover unique collections by location, listing count, and catalog details.",
    url: catalogsUrl,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: catalogs.length,
      itemListElement: catalogs.slice(0, 100).map((catalog, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${baseUrl}/${catalog.id}`,
        name: catalog.title ?? "Unnamed Garden",
        ...(catalog.description && {
          description: catalog.description,
        }),
      })),
    },
    isPartOf: {
      "@type": "WebSite",
      name: METADATA_CONFIG.SITE_NAME,
      url: baseUrl,
    },
  };

  const catalogsFaqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I find a daylily catalog to browse?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Open the catalogs page and use the search box to find growers by catalog title, location, or description.",
        },
      },
      {
        "@type": "Question",
        name: "What can I see in a public daylily catalog?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Each catalog can include listing photos, descriptions, prices, and curated lists that help you explore a grower’s collection.",
        },
      },
      {
        "@type": "Question",
        name: "Are hidden listings shown on public catalogs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Listings marked as hidden are excluded from public catalog pages and are not included in sitemap entries.",
        },
      },
    ],
  };

  return (
    <MainContent>
      {/* Add breadcrumb schema - keeping only what works for rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(catalogsFaqSchema) }}
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
