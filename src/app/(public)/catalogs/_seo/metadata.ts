import { IMAGES } from "@/lib/constants/images";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";
import { unstable_cache } from "next/cache";
import { reportError } from "@/lib/error-utils";
import { type CatalogsPageMetadata } from "./types";
import { METADATA_CONFIG } from "@/config/constants";

// Optimal meta description length
const MIN_DESCRIPTION_LENGTH = 70;
const MAX_DESCRIPTION_LENGTH = 160;

// Function to generate metadata for catalogs page
async function createCatalogsPageMetadata(
  url: string,
): Promise<CatalogsPageMetadata> {
  try {
    // Use the site defaults from config with catalog-specific title
    const title = "Browse Daylily Catalogs | " + METADATA_CONFIG.SITE_NAME;
    const pageUrl = `${url}/catalogs`;
    const baseUrl = url; // Add the base URL

    // Create a rich, descriptive text
    let description =
      "Discover beautiful daylilies from growers across the country. Browse our curated collection of daylily catalogs featuring rare and popular varieties.";

    // Ensure description is within length limits
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      description =
        description.substring(0, MAX_DESCRIPTION_LENGTH - 3) + "...";
    } else if (description.length < MIN_DESCRIPTION_LENGTH) {
      // Add generic text if too short (unlikely in this case, but for consistency)
      description += " Perfect for every garden and landscape design.";

      // Truncate if it became too long
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        description =
          description.substring(0, MAX_DESCRIPTION_LENGTH - 3) + "...";
      }
    }

    const imageUrl = getOptimizedMetaImageUrl(IMAGES.DEFAULT_CATALOG);

    return {
      url,
      baseUrl,
      title,
      description: description.trim(),
      imageUrl,
      pageUrl,
    };
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
    return {
      url,
      baseUrl: url,
      title: "Browse Daylily Catalogs | " + METADATA_CONFIG.SITE_NAME,
      description:
        "Discover beautiful daylilies from growers across the country. Browse our collection of premium daylily catalogs.",
      imageUrl: getOptimizedMetaImageUrl(IMAGES.DEFAULT_META),
      pageUrl: `${url}/catalogs`,
    };
  }
}

// Cached function to generate catalogs page metadata
export function generateCatalogsPageMetadata(
  url: string,
): Promise<CatalogsPageMetadata> {
  return unstable_cache(
    async () => createCatalogsPageMetadata(url),
    ["catalogs-page-metadata"],
    { revalidate: 3600 },
  )();
}
