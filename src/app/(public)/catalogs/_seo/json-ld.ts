import { unstable_cache } from "next/cache";
import { reportError } from "@/lib/error-utils";
import { type CatalogsPageMetadata } from "./types";

// Function to generate JSON-LD for CollectionPage schema
async function createCollectionPageJsonLd(metadata: CatalogsPageMetadata) {
  try {
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: metadata.title,
      description: metadata.description,
      url: metadata.pageUrl,
      about: {
        "@type": "Thing",
        name: "Daylilies",
        description:
          "Daylilies (Hemerocallis) are flowering plants known for their beautiful blooms and easy care requirements.",
      },
    };
  } catch (error) {
    reportError({
      error:
        error instanceof Error
          ? error
          : new Error("Unknown error in JSON-LD generation"),
      level: "error",
      context: {
        function: "createCollectionPageJsonLd",
      },
    });

    // Minimal valid CollectionPage JSON-LD as fallback
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: metadata.title || "Browse Daylily Catalogs",
      description:
        metadata.description ||
        "Discover beautiful daylilies from growers across the country.",
      url: metadata.pageUrl,
    };
  }
}

// Cached function to generate JSON-LD
export function generateCollectionPageJsonLd(metadata: CatalogsPageMetadata) {
  return unstable_cache(
    async () => createCollectionPageJsonLd(metadata),
    ["catalogs-page-jsonld"],
    { revalidate: 3600 },
  )();
}
