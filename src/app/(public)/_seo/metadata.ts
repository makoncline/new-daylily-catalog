import { IMAGES } from "@/lib/constants/images";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";
import { unstable_cache } from "next/cache";
import { reportError } from "@/lib/error-utils";
import { METADATA_CONFIG } from "@/config/constants";
import { type HomePageMetadata } from "./types";

// Optimal meta description length
const MIN_DESCRIPTION_LENGTH = 70;
const MAX_DESCRIPTION_LENGTH = 160;

// Default keywords for the home page
const DEFAULT_KEYWORDS = [
  "daylily",
  "hemerocallis",
  "garden catalog",
  "plant database",
  "daylily sales",
  "daylily collection",
];

// Function to generate metadata for home page
async function createHomePageMetadata(url: string): Promise<HomePageMetadata> {
  try {
    // Use the site defaults from config
    const title = METADATA_CONFIG.DEFAULT_TITLE;

    // Start with the default description
    let description = METADATA_CONFIG.DEFAULT_DESCRIPTION;

    // Ensure description is within length limits
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      description =
        description.substring(0, MAX_DESCRIPTION_LENGTH - 3) + "...";
    } else if (description.length < MIN_DESCRIPTION_LENGTH) {
      // Add generic text if too short
      description +=
        " Share and sell your daylily collection with our specialized platform.";

      // Truncate if it became too long
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        description =
          description.substring(0, MAX_DESCRIPTION_LENGTH - 3) + "...";
      }
    }

    const imageUrl = getOptimizedMetaImageUrl(IMAGES.DEFAULT_META);

    return {
      url,
      title,
      description: description.trim(),
      imageUrl,
      keywords: DEFAULT_KEYWORDS,
    };
  } catch (error) {
    reportError({
      error:
        error instanceof Error
          ? error
          : new Error("Unknown error in home page metadata generation"),
      level: "error",
      context: {
        function: "createHomePageMetadata",
      },
    });

    // Fallback values
    return {
      url,
      title: METADATA_CONFIG.SITE_NAME,
      description:
        "Discover and showcase daylilies with our specialized platform.",
      imageUrl: getOptimizedMetaImageUrl(IMAGES.DEFAULT_META),
      keywords: DEFAULT_KEYWORDS,
    };
  }
}

// Cached function to generate home page metadata
export function generateHomePageMetadata(
  url: string,
): Promise<HomePageMetadata> {
  return unstable_cache(
    async () => createHomePageMetadata(url),
    ["home-page-metadata"],
    { revalidate: 3600 },
  )();
}
