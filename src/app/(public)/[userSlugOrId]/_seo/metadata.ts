import { IMAGES } from "@/lib/constants/images";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";
import { unstable_cache } from "next/cache";
import { reportError } from "@/lib/error-utils";
import { METADATA_CONFIG } from "@/config/constants";

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
  profile: PublicProfile | null,
  url: string,
) {
  // Handle null profile case
  if (!profile) {
    return {
      url,
      title: "Catalog Not Found",
      description: "The daylily catalog you are looking for does not exist.",
      imageUrl: IMAGES.DEFAULT_CATALOG,
      pageUrl: url,
      openGraph: {
        title: "Catalog Not Found",
        description: "The daylily catalog you are looking for does not exist.",
        siteName: METADATA_CONFIG.SITE_NAME,
        locale: METADATA_CONFIG.LOCALE,
      },
    };
  }

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
    // Always use the stable ID path for SEO/canonical signals.
    const pageUrl = `${url}/${profile.id}`;

    return {
      url,
      title: `${title} | ${METADATA_CONFIG.SITE_NAME}`,
      description: description.trim(),
      imageUrl,
      pageUrl,
      // Let Google show big thumbnails in Search/Discover.
      robots: "index, follow, max-image-preview:large",
      openGraph: {
        title: `${title} | ${METADATA_CONFIG.SITE_NAME}`,
        description: description.trim(),
        url: pageUrl,
        siteName: METADATA_CONFIG.SITE_NAME,
        locale: METADATA_CONFIG.LOCALE,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: "Daylily catalog cover image",
          },
        ],
        type: "website",
      },
      twitter: {
        card: METADATA_CONFIG.TWITTER_CARD_TYPE,
        title: `${title} | ${METADATA_CONFIG.SITE_NAME}`,
        description: description.trim(),
        site: METADATA_CONFIG.TWITTER_HANDLE,
        images: [imageUrl],
      },
      alternates: {
        canonical: `/${profile.id}`,
      },
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
      // Let Google show big thumbnails in Search/Discover.
      robots: "index, follow, max-image-preview:large",
      openGraph: {
        title: "Daylily Catalog",
        description: "Browse our collection of beautiful daylilies.",
        siteName: METADATA_CONFIG.SITE_NAME,
        locale: METADATA_CONFIG.LOCALE,
      },
    };
  }
}

// Cached function to generate profile metadata
export function generateProfileMetadata(
  profile: PublicProfile | null,
  url: string,
) {
  return unstable_cache(
    async () => createProfileMetadata(profile, url),
    [`profile-metadata-${profile?.id ?? "not-found"}`],
    { revalidate: 3600 },
  )();
}
