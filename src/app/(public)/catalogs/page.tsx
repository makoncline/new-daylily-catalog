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

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Browse Daylily Catalogs | Daylily Catalog",
    description:
      "Discover beautiful daylilies from growers across the country. Browse our curated collection of daylily catalogs featuring rare and popular varieties.",
    openGraph: {
      title: "Browse Daylily Catalogs | Daylily Catalog",
      description:
        "Discover beautiful daylilies from growers across the country. Browse our curated collection of daylily catalogs featuring rare and popular varieties.",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Browse Daylily Catalogs | Daylily Catalog",
      description:
        "Discover beautiful daylilies from growers across the country. Browse our curated collection of daylily catalogs featuring rare and popular varieties.",
    },
    other: {
      // CollectionPage JSON-LD for rich results
      "script:ld+json": JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Browse Daylily Catalogs",
        description:
          "Discover beautiful daylilies from growers across the country. Browse our curated collection of daylily catalogs featuring rare and popular varieties.",
        url: `${getBaseUrl()}/catalogs`,
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
        text="Browse beautiful daylily collections from growers around the world."
      />
      <Suspense fallback={<CatalogsLoading />}>
        <CatalogsPageClient initialProfiles={profiles} />
      </Suspense>
    </MainContent>
  );
}
