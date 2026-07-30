import {
  createBreadcrumbListSchema,
  createUserProfileBreadcrumbs,
} from "@/lib/utils/breadcrumbs";
import type { getPublicListingDetail } from "@/server/db/public-listing-read-model";

type PublicListingPageData = Awaited<
  ReturnType<typeof getPublicListingDetail>
>;

interface CreateListingJsonLdArgs {
  baseUrl: string;
  canonicalPath: string;
  description: string;
  imageUrl: string;
  listing: PublicListingPageData;
  listingUrl: string;
}

export function createListingJsonLd({
  baseUrl,
  canonicalPath,
  description,
  imageUrl,
  listing,
  listingUrl,
}: CreateListingJsonLdArgs) {
  const sellerName = listing.sellerTitle ?? "Daylily Catalog";
  const breadcrumbs = createBreadcrumbListSchema(baseUrl, [
    ...createUserProfileBreadcrumbs(
      baseUrl,
      sellerName,
      listing.userSlug,
      listing.userSlug,
    ),
    {
      name: listing.title,
      url: listingUrl,
      canonicalUrl: `${baseUrl}${canonicalPath}`,
    },
  ]);

  if (!listing.price) {
    return [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: listing.title,
        description,
        image: imageUrl,
        url: listingUrl,
        mainEntity: {
          "@type": "Thing",
          name: listing.title,
          description,
          image: imageUrl,
          url: listingUrl,
        },
        publisher: {
          "@type": "Organization",
          name: sellerName,
        },
      },
      breadcrumbs,
    ];
  }

  const productSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description,
    image: imageUrl,
    url: listingUrl,
    brand: {
      "@type": "Organization",
      name: sellerName,
    },
    offers: {
      "@type": "Offer",
      price: listing.price.toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: listingUrl,
      seller: {
        "@type": "Organization",
        name: sellerName,
      },
    },
  };

  if (listing.ahsListing) {
    productSchema.additionalProperty = [
      { "@type": "PropertyValue", name: "Cultivar", value: listing.title },
      listing.ahsListing.hybridizer
        ? {
            "@type": "PropertyValue",
            name: "Hybridizer",
            value: listing.ahsListing.hybridizer,
          }
        : null,
      listing.ahsListing.year
        ? {
            "@type": "PropertyValue",
            name: "Year",
            value: listing.ahsListing.year,
          }
        : null,
      listing.ahsListing.ploidy
        ? {
            "@type": "PropertyValue",
            name: "Ploidy",
            value: listing.ahsListing.ploidy,
          }
        : null,
      listing.ahsListing.bloomSize
        ? {
            "@type": "PropertyValue",
            name: "Bloom size",
            value: listing.ahsListing.bloomSize,
          }
        : null,
    ].filter(Boolean);
  }

  return [productSchema, breadcrumbs];
}
