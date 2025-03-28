import { IMAGES } from "@/lib/constants/images";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";
import { unstable_cache } from "next/cache";
import { reportError } from "@/lib/error-utils";
import { type ProfileMetadata } from "./types";

// Optimal meta description length
const MIN_DESCRIPTION_LENGTH = 70;
const MAX_DESCRIPTION_LENGTH = 160;

// Define a type for the profile data structure
interface PublicProfile {
  id: string;
  title: string | null;
  slug: string | null;
  description: string | null;
  location: string | null;
  images?: Array<{ id: string; url: string }>;
  // Add other fields as needed
}

// Function to generate metadata for a user profile
async function createProfileMetadata(
  profile: PublicProfile,
  url: string,
): Promise<ProfileMetadata> {
  try {
    const title = profile.title ?? "Daylily Catalog";

    // Generate description with proper length
    let description = profile.description ?? "";

    // If no description, create one with available information
    if (!description) {
      description = `Browse our collection of beautiful daylilies.${
        profile.location ? ` Located in ${profile.location}.` : ""
      }`;
    }

    // Ensure description is within length limits
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      description =
        description.substring(0, MAX_DESCRIPTION_LENGTH - 3) + "...";
    } else if (description.length < MIN_DESCRIPTION_LENGTH) {
      // Add generic text if too short
      description += " Find unique daylilies for your garden from our catalog.";

      // Truncate if it became too long
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        description =
          description.substring(0, MAX_DESCRIPTION_LENGTH - 3) + "...";
      }
    }

    const rawImageUrl = profile.images?.[0]?.url ?? IMAGES.DEFAULT_CATALOG;
    const imageUrl = getOptimizedMetaImageUrl(rawImageUrl);
    const pageUrl = `${url}/${profile.slug ?? profile.id}`;

    return {
      url,
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
          : new Error("Unknown error in profile metadata generation"),
      level: "error",
      context: {
        profile: { id: profile.id },
        url,
        function: "createProfileMetadata",
      },
    });

    // Fallback values
    return {
      url,
      title: "Daylily Catalog",
      description: "Browse our collection of beautiful daylilies.",
      imageUrl: IMAGES.DEFAULT_CATALOG,
      pageUrl: `${url}/${profile.id}`,
    };
  }
}

// Cached function to generate profile metadata
export function generateProfileMetadata(
  profile: PublicProfile,
  url: string,
): Promise<ProfileMetadata> {
  return unstable_cache(
    async () => createProfileMetadata(profile, url),
    [`profile-metadata-${profile.id}`],
    { revalidate: 3600 },
  )();
}
