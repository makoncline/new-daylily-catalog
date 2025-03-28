import { type Listing } from "./utils";
import { type ListingMetadata } from "./metadata";
import { unstable_cache } from "next/cache";
import { normalizeError, reportError } from "@/lib/error-utils";

// Base function for generating JSON-LD
async function createJsonLd(listing: Listing, metadata: ListingMetadata) {
  try {
    // Basic Product schema with only actual data
    const productSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: metadata.listingName,
      description: metadata.description,
      image: metadata.imageUrl,
      url: metadata.pageUrl,
      sku: listing.id,
      ...(listing.price && {
        offers: {
          "@type": "Offer",
          price: listing.price.toFixed(2),
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], // 30 days from now
          url: metadata.pageUrl,
          seller: {
            "@type": "Organization",
            name: metadata.profileTitle,
            url: `${metadata.url}/${listing.userId}`,
          },
          itemCondition: "https://schema.org/NewCondition",
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingDestination: {
              "@type": "DefinedRegion",
              addressCountry: "US",
            },
          },
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "US",
            returnPolicyCategory:
              "https://schema.org/MerchantReturnNotPermitted",
          },
        },
      }),
      ...(listing.ahsListing && {
        brand: {
          "@type": "Brand",
          name: listing.ahsListing.hybridizer ?? "Unknown Hybridizer",
        },
        additionalProperty: [
          {
            "@type": "PropertyValue",
            name: "Year",
            value: listing.ahsListing.year,
          },
          {
            "@type": "PropertyValue",
            name: "Bloom Size",
            value: listing.ahsListing.bloomSize,
          },
          {
            "@type": "PropertyValue",
            name: "Bloom Season",
            value: listing.ahsListing.bloomSeason,
          },
          {
            "@type": "PropertyValue",
            name: "Form",
            value: listing.ahsListing.form,
          },
          {
            "@type": "PropertyValue",
            name: "Flower Type",
            value: "Daylily",
          },
        ].filter((prop) => prop.value),
      }),
    };

    return productSchema;
  } catch (error) {
    reportError({
      error: normalizeError(error),
      context: {
        listing: { id: listing.id },
        url: metadata.pageUrl,
        source: "createJsonLd",
      },
    });

    // Minimal valid product JSON-LD as fallback - using only essential fields
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: metadata.listingName || "Daylily",
      description: metadata.description || "Daylily listing",
      image: metadata.imageUrl || "/images/default-daylily.jpg",
      url: metadata.pageUrl,
    };
  }
}

// Create a higher-order function that creates a cached function for each listing ID
export function generateJsonLd(listing: Listing, metadata: ListingMetadata) {
  // Use the unstable_cache with only time-based expiration
  return unstable_cache(
    async () => createJsonLd(listing, metadata),
    [`jsonld-${listing.id}`], // Cache key specific to this listing
    {
      revalidate: 3600, // Match page revalidation setting
    },
  )();
}
