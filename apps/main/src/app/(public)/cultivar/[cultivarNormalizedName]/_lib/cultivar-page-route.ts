import { cache } from "react";
import type { Metadata } from "next";
import { METADATA_CONFIG } from "@/config/constants";
import { IMAGES } from "@/lib/constants/images";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";
import { fromCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { getPublicCultivarPage } from "@/server/db/public-cultivar-read-model";
import { buildCultivarMetaDescription } from "./cultivar-meta-description";
import {
  buildNoIndexMetadata,
  buildPublicPageMetadata,
} from "@/app/(public)/_seo/public-seo";

export type CultivarPageData = NonNullable<
  Awaited<ReturnType<typeof getPublicCultivarPage>>
>;

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
