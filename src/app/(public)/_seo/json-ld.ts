import { unstable_cache } from "next/cache";
import { reportError } from "@/lib/error-utils";
import { METADATA_CONFIG } from "@/config/constants";
import { type HomePageMetadata } from "./types";

// Function to generate JSON-LD for WebSite schema
async function createWebsiteJsonLd(metadata: HomePageMetadata) {
  try {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: METADATA_CONFIG.SITE_NAME,
      description: metadata.description,
      url: metadata.url,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${metadata.url}/catalogs?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
      // Add SoftwareApplication schema for app features
      application: {
        "@type": "SoftwareApplication",
        name: METADATA_CONFIG.SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        featureList: [
          "Auto-populate listings from 100,000+ registered cultivars",
          "Professional photo galleries",
          "Custom collection organization",
          "Garden profile and bio",
          "Official cultivar database access",
        ],
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
        function: "createWebsiteJsonLd",
      },
    });

    // Minimal valid WebSite JSON-LD as fallback
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: METADATA_CONFIG.SITE_NAME,
      description:
        metadata.description ||
        "Discover and showcase daylilies with our specialized platform.",
      url: metadata.url,
    };
  }
}

// Cached function to generate JSON-LD
export function generateWebsiteJsonLd(metadata: HomePageMetadata) {
  return unstable_cache(
    async () => createWebsiteJsonLd(metadata),
    ["home-page-jsonld"],
    { revalidate: 3600 },
  )();
}
