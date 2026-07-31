import { reportError } from "@/lib/error-utils";
import { METADATA_CONFIG } from "@/config/constants";
import type { PublicPageMetadata } from "./public-seo";

// Define minimal metadata shape needed for JSON-LD
type MetadataInput = Pick<PublicPageMetadata, "description" | "url">;

const HOME_PAGE_FAQ = [
  {
    question: "What is Daylily Catalog?",
    answer:
      "Daylily Catalog is a web app for growers to publish searchable daylily catalogs, share photos, and organize listings using trusted cultivar data.",
  },
  {
    question: "How large is the cultivar database?",
    answer:
      "Daylily Catalog supports listings powered by a database of more than 100,000 registered cultivars, making it easier to create accurate listings quickly.",
  },
  {
    question: "How do I browse public catalogs?",
    answer:
      "You can browse public grower catalogs at /catalogs, then open each catalog to view listings, photos, and additional daylily details.",
  },
] as const;

async function createHomePageJsonLd(metadata: MetadataInput) {
  try {
    // Add SoftwareApplication only when verified review data is available.
    // Create a schema set that covers both classic SEO and GEO use-cases.
    const schemas = [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: METADATA_CONFIG.SITE_NAME,
        url: metadata.url,
        description: metadata.description,
        inLanguage: "en-US",
      },
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: METADATA_CONFIG.SITE_NAME,
        url: metadata.url,
        description: metadata.description,
        isPartOf: {
          "@type": "WebSite",
          name: METADATA_CONFIG.SITE_NAME,
          url: metadata.url,
        },
      },
      // Organization schema for the company
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: METADATA_CONFIG.SITE_NAME,
        url: metadata.url,
        logo: `${metadata.url}/favicon.ico`,
        description: metadata.description,
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: HOME_PAGE_FAQ.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
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
        function: "createHomePageJsonLd",
      },
    });

    return [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: METADATA_CONFIG.SITE_NAME,
        url: metadata.url,
      },
    ];
  }
}

export async function generateHomePageJsonLd(metadata: MetadataInput) {
  return createHomePageJsonLd(metadata);
}
