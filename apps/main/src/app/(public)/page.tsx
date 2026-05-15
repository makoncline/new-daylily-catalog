import { HomePageSEO } from "./_components/home-seo";
import { generateHomePageMetadata } from "./_seo/metadata";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { trackPublicHtmlOriginRendered } from "@/server/analytics/public-html-origin-posthog";
import HomePageClient, {
  type HomePageCatalog,
} from "./_components/home-page-client";

export const dynamic = "force-dynamic";

const staticHomeCatalogs = [
  {
    id: "3",
    title: "Rolling Oaks Daylilies",
    slug: "rollingoaksdaylilies",
    description: "Rolling Oaks Daylilies - The Daylily Garden of Kay Cline.",
    location: "Picayune, Mississippi",
    listingCount: 3030,
    images: [
      {
        id: "cm6jw663j05l1n5lbjaih756y",
        url: "https://daylily-catalog-images.s3.amazonaws.com/3/fe5c7-CFB870A9-7905-4813-BBD6-56972A124803.jpeg",
      },
    ],
  },
  {
    id: "93",
    title: "PlantFancyGardens",
    slug: "plantfancygardens",
    description: "Offering a rainbow of colorful plants for sale.",
    location: "Troy, South Carolina",
    listingCount: 534,
    images: [
      {
        id: "cmduh50jq0001ki6w10cmdaxa",
        url: "https://daylily-catalog-images.s3.us-east-1.amazonaws.com/93/cm6jw662t05ixn5lbhfkpiduh/2e56dd20.jpg",
      },
    ],
  },
  {
    id: "94",
    title: "Fussell Farms",
    slug: "fussellfarms",
    description: null,
    location: "Chipley, Florida",
    listingCount: 512,
    images: [
      {
        id: "cm6ju52ts02szkpf6p7nbvuix",
        url: "https://daylily-catalog-images.s3.amazonaws.com/profile/94/8c0c6f10-9a85-4780-9d84-b436f521d979",
      },
    ],
  },
  {
    id: "cmc1rb09p0000r1g0xs6g5858",
    title: "Wood Branch Daylilies",
    slug: "cmc1rb09p0000r1g0xs6g5858",
    description: "Home garden and reality escape in Ridgeway SC.",
    location: "Ridgeway, South Carolina",
    listingCount: 410,
    images: [
      {
        id: "cmc1rjeso0006r1g0x01x6rtb",
        url: "https://daylily-catalog-images.s3.us-east-1.amazonaws.com/cmc1rb09p0000r1g0xs6g5858/cmc1rbriq0002r1g0rwh003aj/f05de7fa.jpg",
      },
    ],
  },
  {
    id: "63",
    title: "Haley Springs Farm",
    slug: "haley_springs_farm",
    description:
      "A family farm where hundreds of varieties of daylilies find a home.",
    location: "Maryville, Tennessee",
    listingCount: 373,
    images: [
      {
        id: "cm6ju52tp02snkpf6ndmkrm18",
        url: "https://daylily-catalog-images.s3.amazonaws.com/profile/63/2f846805-f809-4cf1-a045-4e475fe417c0",
      },
    ],
  },
  {
    id: "195",
    title: "Graceful Petals Daylilies",
    slug: "graceful_petals_daylilies",
    description:
      "A hobby garden that enjoys sharing daylilies with other growers.",
    location: "Southern Indiana",
    listingCount: 368,
    images: [
      {
        id: "cm6ju52ti02sdkpf6u3v2myy1",
        url: "https://daylily-catalog-images.s3.amazonaws.com/profile/195/0ed042e3-e6f8-4d30-8d49-6ee00b768995",
      },
    ],
  },
  {
    id: "cm8khl4h8000063ayta4oez5y",
    title: "Eden on Harrell",
    slug: "cm8khl4h8000063ayta4oez5y",
    description: "Hobby daylily breeding in California and Texas.",
    location: "Woodside, California",
    listingCount: 358,
    images: [
      {
        id: "cm8khxaac00053k7l8mf3p1jy",
        url: "https://daylily-catalog-images.s3.us-east-1.amazonaws.com/cm8khl4h8000063ayta4oez5y/cm8khli2o00013k7l7y28qvpe/f0a9c568.jpg",
      },
    ],
  },
  {
    id: "87",
    title: "Starcrossedseeds",
    slug: "starcrossedseeds",
    description: "Cool and unusual patterns from a small hybridizer.",
    location: "Santa Barbara, California",
    listingCount: 161,
    images: [
      {
        id: "cm6ju52tf02s5kpf68e2tz9km",
        url: "https://daylily-catalog-images.s3.amazonaws.com/profile/87/91566ea0-b848-497c-988d-4d1a0964ebd4",
      },
    ],
  },
] satisfies readonly HomePageCatalog[];

export async function generateMetadata() {
  const url = getCanonicalBaseUrl();
  return generateHomePageMetadata(url);
}

export default async function HomePage() {
  const url = getCanonicalBaseUrl();
  const metadata = await generateHomePageMetadata(url);
  trackPublicHtmlOriginRendered({
    routePath: "/",
    routeType: "home",
  });

  return (
    <>
      <HomePageSEO metadata={metadata} />
      <HomePageClient catalogs={staticHomeCatalogs} />
    </>
  );
}
