import type {
  StorefrontCultivarDetails,
  StorefrontListing,
  StorefrontSnapshot,
} from "@/types/storefront";

const UPDATED_AT = "2026-08-29T12:00:00.000Z";
const LISTING_IMAGE_BASE_URLS = [
  "https://media.daylilycatalog.com/users/3/listing-images/4839/cm6jw627d01i7n5lbkstrkmk4",
  "https://media.daylilycatalog.com/users/3/listing-images/3438/cm6jw60zk0001n5lbm20whcqn",
  "https://media.daylilycatalog.com/users/3/listing-images/3433/cm6jw631v02gdn5lbtdg87sfm",
] as const;

function getFixtureImage(id: string) {
  const index = Array.from(id).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  const baseUrl =
    LISTING_IMAGE_BASE_URLS[index % LISTING_IMAGE_BASE_URLS.length]!;

  return {
    url: `${baseUrl}/display-800.webp`,
    thumbUrl: `${baseUrl}/thumb-200.webp`,
    blurUrl: `${baseUrl}/blur-20.webp`,
  };
}

function cultivarDetails(
  id: string,
  name: string,
  overrides: Partial<StorefrontCultivarDetails> = {},
): StorefrontCultivarDetails {
  return {
    id,
    name,
    ahsImageUrl: null,
    hybridizer: "Fixture Garden",
    year: "2024",
    seedlingNum: null,
    scapeHeight: '28"',
    bloomSize: '5.5"',
    bloomSeason: "Midseason",
    rebloom: false,
    ploidy: "Tetraploid",
    foliageType: "Dormant",
    bloomHabit: "Diurnal",
    color: "Cream",
    form: null,
    parentage: null,
    fragrance: "Fragrant",
    budcount: "18",
    branches: "3",
    sculpting: null,
    foliage: null,
    flower: "Single",
    ...overrides,
  };
}

function listing(
  id: string,
  slug: string,
  title: string,
  price: number | null,
  overrides: Partial<StorefrontListing> = {},
): StorefrontListing {
  const cultivarId = `cultivar-${id}`;
  const image = getFixtureImage(id);
  return {
    id,
    slug,
    title,
    description: `${title} is deterministic storefront fixture data.`,
    price,
    images: [
      {
        id: `image-${id}`,
        ...image,
        order: 0,
      },
    ],
    cultivar: {
      id: cultivarId,
      normalizedName: title.toLowerCase(),
      details: cultivarDetails(cultivarId, title),
    },
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

export const rollingOaksStorefrontFixture = {
  version: 1,
  generatedAt: UPDATED_AT,
  seller: {
    id: "3",
    profile: {
      slug: "rollingoaksdaylilies",
      title: "Rolling Oaks Daylilies",
      description:
        "A deterministic catalog fixture for the Rolling Oaks storefront.",
      content: {
        time: 1_777_463_200_000,
        version: "2.30.8",
        blocks: [
          {
            id: "fixture-intro",
            type: "paragraph",
            data: {
              text: "Double and white daylily specialists and an AHS Display Garden.",
            },
          },
        ],
      },
      location: "Hattiesburg, Mississippi",
      images: [
        {
          id: "profile-image-rolling-oaks-1",
          url: "/brands/rolling-oaks/home-1.jpg",
          thumbUrl: "/brands/rolling-oaks/home-1.jpg",
          blurUrl: null,
          order: 0,
        },
        {
          id: "profile-image-rolling-oaks-2",
          url: "/brands/rolling-oaks/home-2.jpg",
          thumbUrl: "/brands/rolling-oaks/home-2.jpg",
          blurUrl: null,
          order: 1,
        },
        {
          id: "profile-image-rolling-oaks-3",
          url: "/brands/rolling-oaks/home-3.jpg",
          thumbUrl: "/brands/rolling-oaks/home-3.jpg",
          blurUrl: null,
          order: 2,
        },
      ],
      updatedAt: UPDATED_AT,
    },
  },
  lists: [
    {
      id: "list-display-garden",
      slug: "display-garden",
      title: "Display Garden",
      description: "Plants grown in the display garden.",
      listingIds: ["listing-boundary-fifty", "listing-quiet-snow"],
      updatedAt: UPDATED_AT,
    },
    {
      id: "list-white-and-double",
      slug: "white-and-double",
      title: "White and Double",
      description: "White and double forms.",
      listingIds: ["listing-boundary-twenty", "listing-quiet-snow"],
      updatedAt: UPDATED_AT,
    },
    {
      id: "list-st-james",
      slug: "st.-james",
      title: "St. James",
      description: "A fixture list that verifies dotted public slugs.",
      listingIds: ["listing-spring-2026"],
      updatedAt: UPDATED_AT,
    },
  ],
  listings: [
    listing("listing-alpine-glow", "alpine-glow", "Alpine Glow", 9.99, {
      cultivar: {
        id: "cultivar-listing-alpine-glow",
        normalizedName: "alpine glow",
        details: cultivarDetails(
          "cultivar-listing-alpine-glow",
          "Alpine Glow",
          {
            scapeHeight: '10"',
            bloomSize: '3"',
            color: "Pink",
          },
        ),
      },
    }),
    listing("listing-boundary-fifty", "boundary-fifty", "Boundary Fifty", 50, {
      cultivar: {
        id: "cultivar-listing-boundary-fifty",
        normalizedName: "boundary fifty",
        details: cultivarDetails(
          "cultivar-listing-boundary-fifty",
          "Boundary Fifty",
          {
            scapeHeight: '40"',
            bloomSize: '7"',
            bloomSeason: "Late",
          },
        ),
      },
    }),
    listing("listing-boundary-ten", "boundary-ten", "Boundary Ten", 10, {
      cultivar: null,
    }),
    listing(
      "listing-boundary-twenty",
      "boundary-twenty",
      "Boundary Twenty",
      20,
      {
        cultivar: {
          id: "cultivar-listing-boundary-twenty",
          normalizedName: "boundary twenty",
          details: cultivarDetails(
            "cultivar-listing-boundary-twenty",
            "Boundary Twenty",
            {
              scapeHeight: '20"',
              bloomSize: '4.5"',
              flower: "Double",
            },
          ),
        },
      },
    ),
    listing("listing-quiet-snow", "quiet-snow", "Quiet Snow", null, {
      images: [
        {
          id: "ahs-image-listing-quiet-snow",
          url: "/brands/rolling-oaks/daylily-3.svg",
          thumbUrl: null,
          blurUrl: null,
          order: 0,
        },
      ],
      cultivar: {
        id: "cultivar-listing-quiet-snow",
        normalizedName: "quiet snow",
        details: cultivarDetails("cultivar-listing-quiet-snow", "Quiet Snow", {
          ahsImageUrl: "/brands/rolling-oaks/daylily-3.svg",
          seedlingNum: "RO-24-1",
          bloomSeason: "Early",
          rebloom: true,
          color: "Near white",
          flower: "Double",
        }),
      },
    }),
    listing("listing-summer-ember", "summer-ember", "Summer Ember", 35, {
      cultivar: {
        id: "cultivar-listing-summer-ember",
        normalizedName: "summer ember",
        details: cultivarDetails(
          "cultivar-listing-summer-ember",
          "Summer Ember",
          {
            bloomSeason: "Early",
            rebloom: false,
            color: "Orange red",
            form: "Spider",
            flower: "Single",
          },
        ),
      },
    }),
    listing("listing-spring-2026", "spring.2026", "Spring 2026", null),
    listing("listing-two-for-tea", "two-for-tea", "2 for Tea", 12),
  ],
} satisfies StorefrontSnapshot;
