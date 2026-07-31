import { cache } from "react";
import type { Metadata } from "next";
import { METADATA_CONFIG } from "@/config/constants";
import { IMAGES } from "@/lib/constants/images";
import { formatAhsListingSummary } from "@/lib/utils";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";
import { fromCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { getPublicCultivarPage } from "@/server/db/public-cultivar-read-model";
import {
  buildNoIndexMetadata,
  buildPublicPageMetadata,
} from "@/app/(public)/_seo/public-seo";

export type CultivarPageData = NonNullable<
  Awaited<ReturnType<typeof getPublicCultivarPage>>
>;

interface CultivarMetaDescriptionInput {
  ahsListing: Parameters<typeof formatAhsListingSummary>[0];
  gardensCount: number;
  hybridizer: string | null;
  name: string;
  offersCount: number;
  year: string | null;
}

export function buildCultivarMetaDescription({
  ahsListing,
  gardensCount,
  hybridizer,
  name,
  offersCount,
  year,
}: CultivarMetaDescriptionInput) {
  const identity = hybridizer
    ? `${name} (${hybridizer}${year ? `, ${year}` : ""})`
    : `${name} daylily`;
  const availability =
    offersCount > 0
      ? `${offersCount.toLocaleString()} public ${offersCount === 1 ? "offer" : "offers"} from ${gardensCount.toLocaleString()} grower ${gardensCount === 1 ? "catalog" : "catalogs"}`
      : "availability from public grower catalogs";
  const generatedSummary = formatAhsListingSummary(ahsListing);

  if (generatedSummary) {
    const availabilitySentence =
      offersCount > 0
        ? `See photos and ${offersCount.toLocaleString()} public ${offersCount === 1 ? "offer" : "offers"} from ${gardensCount.toLocaleString()} grower ${gardensCount === 1 ? "catalog" : "catalogs"}.`
        : "See photos and check public grower catalogs for availability.";
    const normalizedSummary = generatedSummary
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[.;:]+$/, "");
    const summaryLimit = 155 - availabilitySentence.length - 1;
    let fittedSummary = normalizedSummary;

    if (fittedSummary.length + 1 > summaryLimit) {
      const candidate = fittedSummary.slice(0, summaryLimit - 3);
      const lastSpace = candidate.lastIndexOf(" ");
      fittedSummary = `${(lastSpace > 0 ? candidate.slice(0, lastSpace) : candidate)
        .trim()
        .replace(/[,;:]$/, "")}...`;
    } else {
      fittedSummary += ".";
    }

    const generatedDescription = `${fittedSummary} ${availabilitySentence}`;
    if (generatedDescription.length >= 110) {
      return generatedDescription;
    }
  }

  const description = `Explore ${identity}. View cultivar specifications, photos, related daylilies, and ${availability}.`;

  if (description.length <= 155) {
    return description;
  }

  const candidate = description.slice(0, 152);
  const lastSpace = candidate.lastIndexOf(" ");
  const truncated = lastSpace > 110 ? candidate.slice(0, lastSpace) : candidate;

  return `${truncated.trim()}...`;
}

export const getCultivarPageRouteArtifacts = cache(
  async function getCultivarPageRouteArtifacts(
    cultivarNormalizedName: string,
  ): Promise<CultivarPageData | null> {
    if (!fromCultivarRouteSegment(cultivarNormalizedName)) {
      return null;
    }

    return getPublicCultivarPage(cultivarNormalizedName);
  },
);

export async function getCultivarPageMetadata(
  cultivarNormalizedName: string,
): Promise<Metadata> {
  const cultivarPage = await getCultivarPageRouteArtifacts(
    cultivarNormalizedName,
  );

  if (!cultivarPage) {
    return buildNoIndexMetadata({
      title: "Cultivar Not Found",
      description: "The cultivar you are looking for does not exist.",
    });
  }

  const baseUrl = getCanonicalBaseUrl();
  const title = `${cultivarPage.summary.name} | ${METADATA_CONFIG.SITE_NAME}`;
  const description = buildCultivarMetaDescription({
    ahsListing: cultivarPage.cultivar.ahsListing,
    gardensCount: cultivarPage.offers.summary.gardensCount,
    hybridizer: cultivarPage.summary.hybridizer,
    name: cultivarPage.summary.name,
    offersCount: cultivarPage.offers.summary.offersCount,
    year: cultivarPage.summary.year,
  });
  const pageUrl = `${baseUrl}/cultivar/${cultivarNormalizedName}`;
  const rawImageUrl = cultivarPage.heroImages[0]?.url ?? IMAGES.DEFAULT_META;
  const imageUrl = getOptimizedMetaImageUrl(rawImageUrl);

  return buildPublicPageMetadata({
    canonicalPath: `/cultivar/${cultivarNormalizedName}`,
    description,
    imageAlt: `${cultivarPage.summary.name} daylily cultivar`,
    imageUrl,
    pageUrl,
    title,
  });
}
