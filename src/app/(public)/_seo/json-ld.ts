import { unstable_cache } from "next/cache";
import { reportError } from "@/lib/error-utils";
import { METADATA_CONFIG } from "@/config/constants";

// Define minimal metadata shape needed for JSON-LD
type MetadataInput = {
  url: string;
  description: string;
  [key: string]: unknown;
};

// Function to generate JSON-LD for SoftwareApplication schema
async function createSoftwareApplicationJsonLd(metadata: MetadataInput) {
  try {
    // Create both website and application schemas
    const schemas = [
      // SoftwareApplication schema (primary schema for the platform)
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: METADATA_CONFIG.SITE_NAME,
        description: metadata.description,
        url: metadata.url,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
      },
      // Organization schema for the company
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: METADATA_CONFIG.SITE_NAME,
        url: metadata.url,
        logo: `${metadata.url}/images/logo.png`,
        description: metadata.description,
      },
    ];

    return schemas;
  } catch (error) {
    reportError({
      error:
        error instanceof Error
          ? error
          : new Error("Unknown error in JSON-LD generation"),
      level: "error",
      context: {
        function: "createSoftwareApplicationJsonLd",
      },
    });

    // Minimal valid SoftwareApplication JSON-LD as fallback
    return [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: METADATA_CONFIG.SITE_NAME,
        description:
          metadata.description ||
          "Discover beautiful daylilies from growers across the country.",
        applicationCategory: "BusinessApplication",
      },
    ];
  }
}

export const generateSoftwareApplicationJsonLd = unstable_cache(
  async (metadata: MetadataInput) => {
    return createSoftwareApplicationJsonLd(metadata);
  },
  ["software-application-jsonld"],
  {
    revalidate: 3600, // 1 hour
    tags: ["home-page"],
  },
);
