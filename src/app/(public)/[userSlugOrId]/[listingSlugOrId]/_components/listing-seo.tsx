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

  // Create breadcrumb schema
  const breadcrumbSchema = createBreadcrumbListSchema(
    baseUrl,
    createListingBreadcrumbs(
      baseUrl,
      listing.user.profile?.title ?? "Daylily Catalog",
      listing.user.profile?.slug ?? listing.userId,
      listing.title ?? "Daylily Listing",
      listing.slug ?? listing.id,
    ),
  );

  return (
    <>
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
