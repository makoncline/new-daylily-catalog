import type { Metadata } from "next";
import { METADATA_CONFIG } from "@/config/constants";
import { IMAGES } from "@/lib/constants/images";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import { getCachedPublicCultivarPage } from "@/server/db/public-cache";
import {
  buildNoIndexMetadata,
  buildPublicPageMetadata,
} from "@/app/(public)/_seo/public-seo";

export type CultivarPageData = NonNullable<
  Awaited<ReturnType<typeof getCachedPublicCultivarPage>>
>;

export interface CultivarPageRouteArtifacts {
  canonicalSegment: string | null;
  cultivarPage: CultivarPageData;
  routeSegment: string;
}

export async function getCultivarPageRouteArtifacts(
  cultivarNormalizedName: string,
): Promise<CultivarPageRouteArtifacts | null> {
  const cultivarPage = await getCachedPublicCultivarPage(cultivarNormalizedName);

  if (!cultivarPage) {
    return null;
  }

  const canonicalSegment = toCultivarRouteSegment(
    cultivarPage.cultivar.normalizedName,
  );

  return {
    canonicalSegment,
    cultivarPage,
    routeSegment: canonicalSegment ?? cultivarNormalizedName,
  };
}

export async function getCultivarPageMetadata(
  cultivarNormalizedName: string,
): Promise<Metadata> {
  const artifacts = await getCultivarPageRouteArtifacts(cultivarNormalizedName);

  if (!artifacts) {
    return buildNoIndexMetadata({
      title: "Cultivar Not Found",
      description: "The cultivar you are looking for does not exist.",
    });
  }

  if (!artifacts.canonicalSegment) {
    return buildNoIndexMetadata({
      title: "Cultivar Not Found",
      description: "The cultivar you are looking for does not exist.",
    });
  }

  const baseUrl = getCanonicalBaseUrl();
  const title = `${artifacts.cultivarPage.summary.name} | ${METADATA_CONFIG.SITE_NAME}`;
  const description = `${artifacts.cultivarPage.summary.name} with ${artifacts.cultivarPage.offers.summary.offersCount} public offers across ${artifacts.cultivarPage.offers.summary.gardensCount} catalogs.`;
  const pageUrl = `${baseUrl}/cultivar/${artifacts.canonicalSegment}`;
  const rawImageUrl =
    artifacts.cultivarPage.heroImages[0]?.url ?? IMAGES.DEFAULT_META;
  const imageUrl = getOptimizedMetaImageUrl(rawImageUrl);

  return buildPublicPageMetadata({
    canonicalPath: `/cultivar/${artifacts.canonicalSegment}`,
    description,
    imageAlt: `${artifacts.cultivarPage.summary.name} daylily cultivar`,
    imageUrl,
    pageUrl,
    title,
  });
}
