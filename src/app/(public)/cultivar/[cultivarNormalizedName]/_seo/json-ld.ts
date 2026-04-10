import { METADATA_CONFIG } from "@/config/constants";
import type { CultivarPageData } from "../_lib/cultivar-page-route";

export function generateCultivarJsonLd(
  baseUrl: string,
  canonicalSegment: string,
  cultivarPage: CultivarPageData,
) {
  const pageUrl = `${baseUrl}/cultivar/${canonicalSegment}`;
  const productOffers = cultivarPage.offers.gardenCards.flatMap((garden) =>
    garden.offers
      .filter((offer) => offer.price !== null)
      .map((offer) => ({
        "@type": "Offer",
        price: offer.price!.toFixed(2),
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        seller: {
          "@type": "Organization",
          name: garden.title,
          url: `${baseUrl}/${garden.slug}`,
        },
        url: `${baseUrl}/${garden.slug}?viewing=${offer.id}`,
      })),
  );

  const description = `${cultivarPage.summary.name} cultivar page with specs and public catalog offers.`;
  const imageUrls = cultivarPage.heroImages.map((image) => image.url);

  if (productOffers.length === 0) {
    return {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: cultivarPage.summary.name,
      description,
      url: pageUrl,
      ...(imageUrls.length > 0 && {
        image: imageUrls,
      }),
      isPartOf: {
        "@type": "WebSite",
        name: METADATA_CONFIG.SITE_NAME,
        url: baseUrl,
      },
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: cultivarPage.summary.name,
    description,
    url: pageUrl,
    image: imageUrls,
    category: "Daylily Cultivar",
    brand: {
      "@type": "Organization",
      name: METADATA_CONFIG.SITE_NAME,
    },
    additionalProperty: cultivarPage.quickSpecs.all.map((spec) => ({
      "@type": "PropertyValue",
      name: spec.label,
      value: spec.value,
    })),
    offers: productOffers,
    // TODO: Re-enable related-cultivar links after optimizing cultivar-page fan-out.
    /*
    isRelatedTo: cultivarPage.relatedByHybridizer.map((cultivar) => ({
      "@type": "Product",
      name: cultivar.name,
      url: `${baseUrl}/cultivar/${cultivar.segment}`,
      image: cultivar.imageUrl,
    })),
    */
  };
}
