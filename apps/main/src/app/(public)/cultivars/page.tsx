// eslint-disable react/no-danger -- intentional static JSON-LD injection.
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { MainContent } from "@/app/(public)/_components/main-content";
import { METADATA_CONFIG } from "@/config/constants";
import { isPublicCultivarSearchEnabled } from "@/config/feature-flags";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { serializeJsonLd } from "@/lib/utils/json-ld";
import { CultivarSearchPageClient } from "./_components/cultivar-search-page-client";
import { hasAdvancedCultivarSearchState } from "./_lib/cultivar-search-url";

export const dynamic = "force-dynamic";

interface CultivarsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function getFirstSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  searchParams,
}: CultivarsPageProps): Promise<Metadata> {
  if (!isPublicCultivarSearchEnabled()) {
    return {
      robots: {
        follow: false,
        index: false,
      },
    };
  }

  const baseUrl = getCanonicalBaseUrl();
  const hasSearchState = Object.keys((await searchParams) ?? {}).length > 0;
  const title = `Daylily Cultivar Search – Over 100,000 Registered Daylilies | ${METADATA_CONFIG.SITE_NAME}`;
  const description =
    "Search over 100,000 registered daylilies by cultivar, hybridizer, color, bloom traits, photos, and current public catalog availability.";

  return {
    title,
    description,
    alternates: { canonical: `${baseUrl}/cultivars` },
    ...(hasSearchState
      ? {
          robots: {
            follow: true,
            index: false,
          },
        }
      : {}),
    openGraph: {
      title,
      description,
      type: "website",
      url: `${baseUrl}/cultivars`,
    },
  };
}

export default async function CultivarsPage({
  searchParams,
}: CultivarsPageProps) {
  if (!isPublicCultivarSearchEnabled()) {
    notFound();
  }

  const rawSearchParams = (await searchParams) ?? {};
  const baseUrl = getCanonicalBaseUrl();
  const pageUrl = `${baseUrl}/cultivars`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Daylily Cultivar Search",
    description:
      "Search registered daylilies and follow their connections to hybridizers, parentage, photos, and public grower catalogs.",
    url: pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: METADATA_CONFIG.SITE_NAME,
      url: baseUrl,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${pageUrl}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <MainContent className="mx-0 mb-0 max-w-none space-y-0 p-0 md:p-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <CultivarSearchPageClient
        initialState={{
          advanced:
            getFirstSearchParam(rawSearchParams, "advanced") === "true" ||
            hasAdvancedCultivarSearchState(
              (key) => getFirstSearchParam(rawSearchParams, key) !== undefined,
            ),
          award: getFirstSearchParam(rawSearchParams, "award"),
          bloomHabit: getFirstSearchParam(rawSearchParams, "bloomHabit"),
          bloomSizeMax: getFirstSearchParam(rawSearchParams, "bloomSizeMax"),
          bloomSizeMin: getFirstSearchParam(rawSearchParams, "bloomSizeMin"),
          bloomSeason: getFirstSearchParam(rawSearchParams, "bloomSeason"),
          branchesMax: getFirstSearchParam(rawSearchParams, "branchesMax"),
          branchesMin: getFirstSearchParam(rawSearchParams, "branchesMin"),
          budCountMax: getFirstSearchParam(rawSearchParams, "budCountMax"),
          budCountMin: getFirstSearchParam(rawSearchParams, "budCountMin"),
          color: getFirstSearchParam(rawSearchParams, "color"),
          cultivarName: getFirstSearchParam(rawSearchParams, "cultivarName"),
          foliageType: getFirstSearchParam(rawSearchParams, "foliageType"),
          flowerShow: getFirstSearchParam(rawSearchParams, "flowerShow"),
          form: getFirstSearchParam(rawSearchParams, "form"),
          fragrance: getFirstSearchParam(rawSearchParams, "fragrance"),
          hasCultivarPhoto:
            getFirstSearchParam(rawSearchParams, "hasCultivarPhoto") === "true",
          hasForSaleListings:
            getFirstSearchParam(rawSearchParams, "hasForSaleListings") ===
            "true",
          hasListings:
            getFirstSearchParam(rawSearchParams, "hasListings") !== "false",
          hybridizer: getFirstSearchParam(rawSearchParams, "hybridizer"),
          parentage: getFirstSearchParam(rawSearchParams, "parentage"),
          ploidy: getFirstSearchParam(rawSearchParams, "ploidy"),
          q: getFirstSearchParam(rawSearchParams, "q") ?? "",
          scapeHeightMax: getFirstSearchParam(
            rawSearchParams,
            "scapeHeightMax",
          ),
          scapeHeightMin: getFirstSearchParam(
            rawSearchParams,
            "scapeHeightMin",
          ),
          sculptedType: getFirstSearchParam(rawSearchParams, "sculptedType"),
          sort: getFirstSearchParam(rawSearchParams, "sort") ?? "name",
          yearMax: getFirstSearchParam(rawSearchParams, "yearMax"),
          yearMin: getFirstSearchParam(rawSearchParams, "yearMin"),
        }}
      />
    </MainContent>
  );
}
