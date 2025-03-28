import { unstable_cache } from "next/cache";
import { reportError } from "@/lib/error-utils";
import { type ProfileMetadata } from "./types";

// Define a type for the profile data structure
interface PublicProfile {
  id: string;
  title: string | null;
  slug: string | null;
  description: string | null;
  location: string | null;
  // Add other fields as needed
}

// Function to generate JSON-LD for organization schema
async function createOrganizationJsonLd(
  profile: PublicProfile,
  metadata: ProfileMetadata,
) {
  try {
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: metadata.title,
      description: metadata.description,
      image: metadata.imageUrl,
      url: metadata.pageUrl,
      ...(profile.location && {
        address: {
          "@type": "PostalAddress",
          addressLocality: profile.location,
        },
      }),
    };
  } catch (error) {
    reportError({
      error:
        error instanceof Error
          ? error
          : new Error("Unknown error in JSON-LD generation"),
      level: "error",
      context: {
        profile: { id: profile.id },
        function: "createOrganizationJsonLd",
      },
    });

    // Minimal valid organization JSON-LD as fallback
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: metadata.title || "Daylily Catalog",
      description:
        metadata.description || "Browse our collection of beautiful daylilies.",
      url: metadata.pageUrl,
    };
  }
}

// Cached function to generate JSON-LD
export function generateOrganizationJsonLd(
  profile: PublicProfile,
  metadata: ProfileMetadata,
) {
  return unstable_cache(
    async () => createOrganizationJsonLd(profile, metadata),
    [`org-jsonld-${profile.id}`],
    { revalidate: 3600 },
  )();
}
