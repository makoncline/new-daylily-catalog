import { type Metadata } from "next";
import HomePageClient from "./_components/home-page-client";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Daylily Catalog | Create Your Professional Online Daylily Catalog",
    description:
      "Create a stunning catalog for your daylily collection. Auto-populate listings from our database of 100,000+ registered cultivars, organize your garden, and share your passion with fellow enthusiasts.",
    keywords: [
      "daylily",
      "hemerocallis",
      "garden catalog",
      "plant database",
      "daylily sales",
      "daylily collection",
    ],
    openGraph: {
      title: "Create Your Professional Online Daylily Catalog",
      description:
        "Create a stunning catalog for your daylily collection. Auto-populate listings from our database of 100,000+ registered cultivars, organize your garden, and share your passion with fellow enthusiasts.",
      images: [
        {
          url: "/assets/DALL·E 2025-01-22 16.11.46 - A professional photograph of a stunning daylily garden at golden hour. The garden features various colorful daylilies in full bloom, including vibrant.webp",
          width: 1200,
          height: 630,
          alt: "Beautiful daylily garden at golden hour",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Create Your Professional Online Daylily Catalog",
      description:
        "Create a stunning catalog for your daylily collection. Auto-populate listings from our database of 100,000+ registered cultivars, organize your garden, and share your passion with fellow enthusiasts.",
      images: [
        "/assets/DALL·E 2025-01-22 16.11.46 - A professional photograph of a stunning daylily garden at golden hour. The garden features various colorful daylilies in full bloom, including vibrant.webp",
      ],
    },
    other: {
      // WebSite JSON-LD for rich results
      "script:ld+json": JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Daylily Catalog",
        description:
          "Create a stunning catalog for your daylily collection. Auto-populate listings from our database of 100,000+ registered cultivars, organize your garden, and share your passion with fellow enthusiasts.",
        url: getBaseUrl(),
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${getBaseUrl()}/catalogs?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
        // Add SoftwareApplication schema for app features
        application: {
          "@type": "SoftwareApplication",
          name: "Daylily Catalog",
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
      }),
    },
  };
}

export default async function HomePage() {
  return <HomePageClient />;
}
