import { notFound, permanentRedirect } from "next/navigation";
import { type Metadata } from "next";
import { cache } from "react";
import { MainContent } from "@/app/(public)/_components/main-content";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CultivarCatalogCard } from "@/components/cultivar-catalog-card";
import { METADATA_CONFIG } from "@/config/constants";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import {
  toCultivarRouteSegment,
  toSentenceCaseCultivarName,
} from "@/lib/utils/cultivar-utils";
import {
  getCultivarRouteSegments,
  getPublicCultivarPage,
} from "@/server/db/getPublicCultivars";
import {
  CultivarCatalogsSection,
  CultivarPageRoot,
} from "./_components/cultivar-page-layout";
import { CultivarPageAhsDisplay } from "./_components/cultivar-page-ahs-display";

export const revalidate = 3600;
export const dynamicParams = true;
const getPublicCultivarPageCached = cache(getPublicCultivarPage);

interface PageProps {
  params: Promise<{
    cultivarNormalizedName: string;
  }>;
}

export async function generateStaticParams() {
  const cultivarSegments = await getCultivarRouteSegments();

  return cultivarSegments.map((cultivarNormalizedName) => ({
    cultivarNormalizedName,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { cultivarNormalizedName } = await params;
  const cultivarPage = await getPublicCultivarPageCached(cultivarNormalizedName);

  if (!cultivarPage) {
    return {
      title: "Cultivar Not Found",
      description: "The cultivar you are looking for does not exist.",
      robots: "noindex, nofollow",
    };
  }

  const baseUrl = getBaseUrl();
  const canonicalSegment = toCultivarRouteSegment(
    cultivarPage.cultivar.normalizedName,
  );

  if (!canonicalSegment) {
    return {
      title: "Cultivar Not Found",
      description: "The cultivar you are looking for does not exist.",
      robots: "noindex, nofollow",
    };
  }

  const cultivarName =
    cultivarPage.cultivar.ahsListing?.name ??
    toSentenceCaseCultivarName(cultivarPage.cultivar.normalizedName) ??
    "Daylily Cultivar";

  const title = `${cultivarName} | ${METADATA_CONFIG.SITE_NAME}`;
  const listingCount = cultivarPage.catalogs.reduce(
    (sum, catalog) => sum + catalog.cultivarListings.length,
    0,
  );
  const description = `${cultivarName} available across ${cultivarPage.catalogs.length} pro ${cultivarPage.catalogs.length === 1 ? "catalog" : "catalogs"} with ${listingCount} linked ${listingCount === 1 ? "listing" : "listings"}.`;
  const pageUrl = `${baseUrl}/cultivar/${canonicalSegment}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/cultivar/${canonicalSegment}`,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: METADATA_CONFIG.SITE_NAME,
      locale: METADATA_CONFIG.LOCALE,
      type: "website",
    },
    twitter: {
      card: METADATA_CONFIG.TWITTER_CARD_TYPE,
      title,
      description,
      site: METADATA_CONFIG.TWITTER_HANDLE,
    },
  };
}

export default async function CultivarPage({ params }: PageProps) {
  const { cultivarNormalizedName } = await params;
  const cultivarPage = await getPublicCultivarPageCached(cultivarNormalizedName);

  if (!cultivarPage) {
    notFound();
  }

  const cultivarName =
    cultivarPage.cultivar.ahsListing?.name ??
    toSentenceCaseCultivarName(cultivarPage.cultivar.normalizedName) ??
    "Daylily Cultivar";

  const canonicalSegment = toCultivarRouteSegment(
    cultivarPage.cultivar.normalizedName,
  );
  const requestSegment = toCultivarRouteSegment(cultivarNormalizedName);

  if (canonicalSegment && requestSegment && canonicalSegment !== requestSegment) {
    permanentRedirect(`/cultivar/${canonicalSegment}`);
  }

  return (
    <MainContent>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <Breadcrumbs
          items={[
            { title: "Catalogs", href: "/catalogs" },
            { title: cultivarName },
          ]}
        />

        <CultivarPageRoot>
          {cultivarPage.cultivar.ahsListing && (
            <CultivarPageAhsDisplay
              ahsListing={cultivarPage.cultivar.ahsListing}
            />
          )}

          <CultivarCatalogsSection>
            <div className="space-y-4">
              {cultivarPage.catalogs.map((catalog) => (
                <CultivarCatalogCard key={catalog.userId} catalog={catalog} />
              ))}
            </div>
          </CultivarCatalogsSection>
        </CultivarPageRoot>
      </div>
    </MainContent>
  );
}
