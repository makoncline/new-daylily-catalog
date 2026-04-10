import { IMAGES } from "@/lib/constants/images";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";
import { reportError } from "@/lib/error-utils";
import { METADATA_CONFIG } from "@/config/constants";
import { buildPublicPageMetadata } from "@/app/(public)/_seo/public-seo";
import { type Metadata } from "next";

// Optimal meta description length
const MIN_DESCRIPTION_LENGTH = 70;
const MAX_DESCRIPTION_LENGTH = 160;

// Function to generate metadata for catalogs page
async function createCatalogsPageMetadata(url: string): Promise<Metadata> {
  try {
    const title = `Browse Daylily Catalogs | ${METADATA_CONFIG.SITE_NAME}`;
    const pageUrl = `${url}/catalogs`;
    let description =
      "Discover beautiful daylilies from growers across the country. Browse our curated collection of daylily catalogs featuring rare and popular varieties.";

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      description =
        description.substring(0, MAX_DESCRIPTION_LENGTH - 3) + "...";
    } else if (description.length < MIN_DESCRIPTION_LENGTH) {
      description += " Perfect for every garden and landscape design.";

      if (description.length > MAX_DESCRIPTION_LENGTH) {
        description =
          description.substring(0, MAX_DESCRIPTION_LENGTH - 3) + "...";
      }
    }

    const imageUrl = getOptimizedMetaImageUrl(IMAGES.DEFAULT_CATALOG);

    return buildPublicPageMetadata({
      canonicalPath: "/catalogs",
      description: description.trim(),
      imageAlt: "Collection of beautiful daylily catalogs",
      imageUrl,
      metadataBase: new URL(url),
      pageUrl,
      title,
    });
  } catch (error) {
    reportError({
      error:
        error instanceof Error
          ? error
          : new Error("Unknown error in catalogs page metadata generation"),
      level: "error",
      context: {
        function: "createCatalogsPageMetadata",
      },
    });

    // Fallback values
    return buildPublicPageMetadata({
      canonicalPath: "/catalogs",
      description:
        "Discover beautiful daylilies from growers across the country. Browse our collection of premium daylily catalogs.",
      imageAlt: "Collection of beautiful daylily catalogs",
      imageUrl: getOptimizedMetaImageUrl(IMAGES.DEFAULT_META),
      metadataBase: new URL(url),
      pageUrl: `${url}/catalogs`,
      title: `Browse Daylily Catalogs | ${METADATA_CONFIG.SITE_NAME}`,
    });
  }
}

export function generateCatalogsPageMetadata(
  url: string,
): Promise<Metadata> {
  return createCatalogsPageMetadata(url);
}
