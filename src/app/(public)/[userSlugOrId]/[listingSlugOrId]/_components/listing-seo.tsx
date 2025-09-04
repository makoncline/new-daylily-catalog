import { generateJsonLd } from "../_seo/json-ld";
import {
  createBreadcrumbListSchema,
  createListingBreadcrumbs,
} from "@/lib/utils/breadcrumbs";

// Define types using types from the functions directly
type Listing = Parameters<typeof generateJsonLd>[0];
type Metadata = Parameters<typeof generateJsonLd>[1];

interface ListingPageSEOProps {
  listing: Listing;
  metadata: Metadata;
  baseUrl: string;
}

export async function ListingPageSEO({
  listing,
  metadata,
  baseUrl,
}: ListingPageSEOProps) {
  const jsonLd = await generateJsonLd(listing, metadata);

  const breadcrumbSchema = createBreadcrumbListSchema(
    baseUrl,
    createListingBreadcrumbs(
      baseUrl,
      listing.user.profile?.title ?? "Daylily Catalog",
      listing.user.profile?.slug ?? listing.userId,
      listing.title ?? "Daylily Listing",
      listing.slug ?? listing.id,
      listing.userId, // Pass canonical user ID
      listing.id, // Pass canonical listing ID
    ),
  );

  const price = listing.price?.toFixed(2) ?? "0.00";

  return (
    <>
      {/* Product-specific OpenGraph meta tags for social media platforms */}
      <meta property="og:type" content="product" />
      <meta property="product:price:amount" content={price} />
      <meta property="product:price:currency" content="USD" />
      <meta property="product:availability" content="in stock" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
