import { HomePageSEO } from "./_components/home-seo";
import { generateHomePageMetadata } from "./_seo/metadata";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import HomePageClient, {
  type HomePageCatalog,
} from "./_components/home-page-client";

export const dynamic = "force-dynamic";

function getStaticProfileImage(args: {
  imageId: string;
  originalExtension?: "jpeg" | "jpg";
  userId: string;
}) {
  const baseUrl = `https://media.daylilycatalog.com/users/${args.userId}/profile-images/${args.imageId}`;
  const displayUrl = `${baseUrl}/display-800.webp`;

  return {
    id: args.imageId,
    url: displayUrl,
    imageAsset: {
      id: args.imageId,
      status: "ready",
      originalUrl: `${baseUrl}/original.${args.originalExtension ?? "jpg"}`,
      displayUrl,
      thumbUrl: `${baseUrl}/thumb-200.webp`,
      blurUrl: `${baseUrl}/blur-20.webp`,
    },
  };
}

const staticHomeCatalogs = [
  {
    id: "3",
    title: "Rolling Oaks Daylilies",
    slug: "rollingoaksdaylilies",
    description: "Rolling Oaks Daylilies - The Daylily Garden of Kay Cline.",
    location: "Picayune, Mississippi",
    listingCount: 3030,
    images: [
      getStaticProfileImage({
        imageId: "cm6jw663j05l1n5lbjaih756y",
        originalExtension: "jpeg",
        userId: "3",
      }),
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
      getStaticProfileImage({
        imageId: "cmduh50jq0001ki6w10cmdaxa",
        userId: "93",
      }),
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
      getStaticProfileImage({
        imageId: "cm6ju52ts02szkpf6p7nbvuix",
        userId: "94",
      }),
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
      getStaticProfileImage({
        imageId: "cmc1rjeso0006r1g0x01x6rtb",
        userId: "cmc1rb09p0000r1g0xs6g5858",
      }),
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
      getStaticProfileImage({
        imageId: "cm6ju52tp02snkpf6ndmkrm18",
        userId: "63",
      }),
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
      getStaticProfileImage({
        imageId: "cm6ju52ti02sdkpf6u3v2myy1",
        userId: "195",
      }),
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
      getStaticProfileImage({
        imageId: "cm8khxaac00053k7l8mf3p1jy",
        userId: "cm8khl4h8000063ayta4oez5y",
      }),
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
      getStaticProfileImage({
        imageId: "cm6ju52tf02s5kpf68e2tz9km",
        userId: "87",
      }),
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

  return (
    <>
      <HomePageSEO metadata={metadata} />
      <HomePageClient catalogs={staticHomeCatalogs} />
    </>
  );
}
