import { notFound, permanentRedirect } from "next/navigation";
import { type Metadata } from "next";
import { cache } from "react";
import { MainContent } from "@/app/(public)/_components/main-content";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { METADATA_CONFIG } from "@/config/constants";
import { IMAGES } from "@/lib/constants/images";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import { api } from "@/trpc/server";
import {
  getCultivarRouteSegments,
  getPublicCultivarPage,
} from "@/server/db/getPublicCultivars";
import { CultivarPageRoot, CultivarPageSection } from "./_components/cultivar-page-layout";
import { CultivarHeroSection } from "./_components/cultivar-hero-section";
import { CultivarGardenPhotosSection } from "./_components/cultivar-garden-photos-section";
import { CultivarOffersSection } from "./_components/cultivar-offers-section";
import { CultivarRelatedSection } from "./_components/cultivar-related-section";
import { Muted } from "@/components/typography";

export const revalidate = 3600;
export const dynamicParams = true;

const getCultivarRouteSegmentsCached = cache(getCultivarRouteSegments);
const getPublicCultivarPageMetadataCached = cache(getPublicCultivarPage);
const getCultivarPageFromTrpcCached = cache((cultivarNormalizedName: string) =>
  api.public.getCultivarPage({ cultivarNormalizedName }),
);

interface PageProps {
  params: Promise<{
    cultivarNormalizedName: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getCultivarJsonLd(
  baseUrl: string,
  canonicalSegment: string,
  cultivarPage: NonNullable<Awaited<ReturnType<typeof getPublicCultivarPage>>>,
) {
  const pageUrl = `${baseUrl}/cultivar/${canonicalSegment}`;
  const productOffers = cultivarPage.offers.gardenCards.flatMap((garden) =>
    garden.offers
      .filter((offer) => offer.price !== null)
      .map((offer) => ({
        "@type": "Offer",
        price: offer.price!.toFixed(2),
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        seller: {
          "@type": "Organization",
          name: garden.title,
          url: `${baseUrl}/${garden.slug}`,
        },
        url: `${baseUrl}/${garden.slug}?viewing=${offer.id}`,
      })),
  );

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: cultivarPage.summary.name,
    description: `${cultivarPage.summary.name} cultivar page with specs and public garden offers.`,
    url: pageUrl,
    image: cultivarPage.heroImages.map((image) => image.url),
    category: "Daylily Cultivar",
    brand: {
      "@type": "Organization",
      name: METADATA_CONFIG.SITE_NAME,
    },
    additionalProperty: cultivarPage.quickSpecs.all.map((spec) => ({
      "@type": "PropertyValue",
      name: spec.label,
      value: spec.value,
    })),
    ...(productOffers.length > 0
      ? {
          offers: productOffers,
        }
      : {}),
    isRelatedTo: cultivarPage.relatedByHybridizer.map((cultivar) => ({
      "@type": "Product",
      name: cultivar.name,
      url: `${baseUrl}/cultivar/${cultivar.segment}`,
      image: cultivar.imageUrl,
    })),
  };
}

export async function generateStaticParams() {
  const cultivarSegments = await getCultivarRouteSegmentsCached();

  return cultivarSegments.map((cultivarNormalizedName) => ({
    cultivarNormalizedName,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { cultivarNormalizedName } = await params;
  const cultivarPage = await getPublicCultivarPageMetadataCached(cultivarNormalizedName);

  if (!cultivarPage) {
    return {
      title: "Cultivar Not Found",
      description: "The cultivar you are looking for does not exist.",
      robots: "noindex, nofollow",
    };
  }

  const baseUrl = getBaseUrl();
  const canonicalSegment = toCultivarRouteSegment(cultivarPage.cultivar.normalizedName);

  if (!canonicalSegment) {
    return {
      title: "Cultivar Not Found",
      description: "The cultivar you are looking for does not exist.",
      robots: "noindex, nofollow",
    };
  }

  const title = `${cultivarPage.summary.name} | ${METADATA_CONFIG.SITE_NAME}`;
  const description = `${cultivarPage.summary.name} with ${cultivarPage.offers.summary.offersCount} public offers across ${cultivarPage.offers.summary.gardensCount} pro gardens.`;
  const pageUrl = `${baseUrl}/cultivar/${canonicalSegment}`;
  const rawImageUrl = cultivarPage.heroImages[0]?.url ?? IMAGES.DEFAULT_META;
  const imageUrl = getOptimizedMetaImageUrl(rawImageUrl);

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
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${cultivarPage.summary.name} daylily cultivar`,
        },
      ],
    },
    twitter: {
      card: METADATA_CONFIG.TWITTER_CARD_TYPE,
      title,
      description,
      site: METADATA_CONFIG.TWITTER_HANDLE,
      images: [imageUrl],
    },
  };
}

export default async function CultivarPage({ params, searchParams }: PageProps) {
  const { cultivarNormalizedName } = await params;
  const queryParams = await searchParams;

  const cultivarPage = await getCultivarPageFromTrpcCached(cultivarNormalizedName);

  if (!cultivarPage) {
    notFound();
  }

  const canonicalSegment = toCultivarRouteSegment(cultivarPage.cultivar.normalizedName);

  if (canonicalSegment && cultivarNormalizedName !== canonicalSegment) {
    const query = new URLSearchParams();

    Object.entries(queryParams).forEach(([key, value]) => {
      if (typeof value === "string") {
        query.append(key, value);
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((entry) => query.append(key, entry));
      }
    });

    const queryString = query.toString();
    permanentRedirect(
      queryString
        ? `/cultivar/${canonicalSegment}?${queryString}`
        : `/cultivar/${canonicalSegment}`,
    );
  }

  const baseUrl = getBaseUrl();
  const jsonLd = getCultivarJsonLd(
    baseUrl,
    canonicalSegment ?? cultivarNormalizedName,
    cultivarPage,
  );

  return (
    <MainContent>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <Breadcrumbs
          items={[
            { title: "Cultivars" },
            { title: cultivarPage.summary.name },
          ]}
        />

        <CultivarPageRoot>
          <CultivarPageSection>
            <CultivarHeroSection cultivarPage={cultivarPage} />
          </CultivarPageSection>

          <CultivarPageSection>
            <CultivarGardenPhotosSection photos={cultivarPage.gardenPhotos} />
          </CultivarPageSection>

          <CultivarPageSection>
            <CultivarOffersSection offers={cultivarPage.offers} />
          </CultivarPageSection>

          <CultivarPageSection>
            <CultivarRelatedSection
              relatedCultivars={cultivarPage.relatedByHybridizer}
              hybridizer={cultivarPage.summary.hybridizer}
            />
          </CultivarPageSection>

          <footer id="cultivar-metadata" className="space-y-2 border-t pt-6">
            <Muted>
              {cultivarPage.summary.name} registered with American Hemerocallis Society.
            </Muted>

            <Muted>
              Last updated {new Date(cultivarPage.freshness.cultivarUpdatedAt).toLocaleDateString()}.
            </Muted>
          </footer>
        </CultivarPageRoot>
      </div>
    </MainContent>
  );
}
