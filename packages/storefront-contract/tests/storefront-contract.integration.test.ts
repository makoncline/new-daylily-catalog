import { describe, expect, it } from "vitest";
import {
  inquiryReceiptSchema,
  inquirySchema,
  isCanonicalStorefrontBearerToken,
  storefrontSiteIdentities,
  storefrontSnapshotSchema,
  type StorefrontSnapshot,
} from "../src/index";

const INQUIRY_TOKEN = "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE";

function getSnapshot(): StorefrontSnapshot {
  return {
    version: 1,
    generatedAt: "2026-08-29T12:00:00.000Z",
    seller: {
      id: "3",
      profile: {
        slug: "rolling-oaks-daylilies",
        title: "Rolling Oaks Daylilies",
        description: null,
        content: null,
        location: "Hattiesburg, Mississippi",
        images: [
          {
            id: "profile-image-1",
            url: "/brands/rolling-oaks/home-1.jpg",
            thumbUrl: null,
            blurUrl: null,
            order: 0,
          },
        ],
        updatedAt: "2026-08-29T12:00:00.000Z",
      },
    },
    lists: [
      {
        id: "list-1",
        slug: "display-garden",
        title: "Display Garden",
        description: null,
        listingIds: ["listing-1"],
        updatedAt: "2026-08-29T12:00:00.000Z",
      },
    ],
    listings: [
      {
        id: "listing-1",
        slug: "quiet-snow",
        title: "Quiet Snow",
        description: null,
        price: null,
        images: [
          {
            id: "listing-image-1",
            url: "https://images.daylilycatalog.com/display.webp",
            thumbUrl: "https://images.daylilycatalog.com/thumb.webp",
            blurUrl: "https://images.daylilycatalog.com/blur.webp",
            order: 0,
          },
        ],
        cultivar: {
          id: "cultivar-1",
          normalizedName: "quiet snow",
          details: {
            id: "ahs-1",
            name: "Quiet Snow",
            ahsImageUrl: null,
            hybridizer: "Fixture Garden",
            year: "2024",
            seedlingNum: "RO-24-1",
            scapeHeight: null,
            bloomSize: null,
            bloomSeason: null,
            rebloom: true,
            ploidy: null,
            foliageType: null,
            bloomHabit: null,
            color: null,
            form: null,
            parentage: null,
            fragrance: null,
            budcount: null,
            branches: null,
            sculpting: null,
            foliage: null,
            flower: null,
          },
        },
        updatedAt: "2026-08-29T12:00:00.000Z",
      },
    ],
  };
}

describe("approved storefront site identities", () => {
  it("approves only the Rolling Oaks seller and hosts", () => {
    expect(storefrontSiteIdentities).toEqual([
      {
        siteKey: "rolling-oaks",
        expectedSellerId: "3",
        canonicalUrl: "https://rollingoaksdaylilies.com",
        hostnames: [
          "rollingoaksdaylilies.com",
          "www.rollingoaksdaylilies.com",
          "rolling-oaks-daylilies.makon.dev",
        ],
      },
    ]);
  });
});

describe("storefront bearer token contract", () => {
  it("accepts only canonical unpadded base64url with at least 32 bytes", () => {
    expect(isCanonicalStorefrontBearerToken(INQUIRY_TOKEN)).toBe(true);
    expect(isCanonicalStorefrontBearerToken("test-token")).toBe(false);
    expect(isCanonicalStorefrontBearerToken(`${INQUIRY_TOKEN}=`)).toBe(false);
    expect(
      isCanonicalStorefrontBearerToken(`${INQUIRY_TOKEN.slice(0, -1)}B`),
    ).toBe(false);
  });
});

describe("storefront snapshot contract", () => {
  it("accepts the canonical v1 snapshot with image variants", () => {
    expect(storefrontSnapshotSchema.parse(getSnapshot())).toEqual(
      getSnapshot(),
    );
  });

  it("rejects unsafe image variants and unknown fields", () => {
    const unsafeVariant = getSnapshot();
    unsafeVariant.listings[0]!.images[0]!.thumbUrl =
      "https://unapproved.example/thumb.webp";
    expect(storefrontSnapshotSchema.safeParse(unsafeVariant).success).toBe(
      false,
    );

    const unknownField = getSnapshot() as StorefrontSnapshot & {
      privateNote?: string;
    };
    unknownField.privateNote = "private";
    expect(storefrontSnapshotSchema.safeParse(unknownField).success).toBe(
      false,
    );

    const approvedLocalImage = getSnapshot();
    approvedLocalImage.listings[0]!.images[0]!.url =
      "/brands/rolling-oaks/daylily.jpg";
    expect(storefrontSnapshotSchema.safeParse(approvedLocalImage).success).toBe(
      true,
    );

    const unownedLocalImage = getSnapshot();
    unownedLocalImage.listings[0]!.images[0]!.url = "/assets/daylily.jpg";
    expect(storefrontSnapshotSchema.safeParse(unownedLocalImage).success).toBe(
      false,
    );

    for (const unsafeLocalPath of [
      "/brands/../api/health",
      "/brands/daylily.jpg?variant=private",
      "/brands\\daylily.jpg",
    ]) {
      const unsafeLocalImage = getSnapshot();
      unsafeLocalImage.listings[0]!.images[0]!.url = unsafeLocalPath;
      expect(storefrontSnapshotSchema.safeParse(unsafeLocalImage).success).toBe(
        false,
      );
    }
  });

  it("rejects duplicate identities, routes, image orders, and broken list references", () => {
    const snapshot = getSnapshot();
    snapshot.listings.push({
      ...structuredClone(snapshot.listings[0]!),
      slug: "catalog",
      images: [
        ...structuredClone(snapshot.listings[0]!.images),
        {
          id: "listing-image-2",
          url: "/second.webp",
          thumbUrl: null,
          blurUrl: null,
          order: 0,
        },
      ],
    });
    snapshot.lists.push({
      ...structuredClone(snapshot.lists[0]!),
      slug: "all",
      listingIds: ["missing-listing"],
    });

    const result = storefrontSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(
      expect.arrayContaining([
        "listings.1.id",
        "listings.1.slug",
        "listings.1.images.1.order",
        "lists.1.id",
        "lists.1.slug",
        "lists.1.listingIds.0",
      ]),
    );
  });

  it("rejects blank public identities and titles and negative prices", () => {
    const snapshot = getSnapshot();
    snapshot.seller.id = " ";
    snapshot.lists[0]!.title = "";
    snapshot.listings[0]!.images[0]!.id = "";
    snapshot.listings[0]!.price = -1;

    expect(storefrontSnapshotSchema.safeParse(snapshot).success).toBe(false);
  });

  it("accepts dotted route slugs without accepting path dot segments", () => {
    const snapshot = getSnapshot();
    snapshot.listings[0]!.slug = "spring.2026";
    snapshot.lists[0]!.slug = "display.garden";
    expect(storefrontSnapshotSchema.safeParse(snapshot).success).toBe(true);

    snapshot.listings[0]!.slug = ".";
    snapshot.lists[0]!.slug = "..";
    expect(storefrontSnapshotSchema.safeParse(snapshot).success).toBe(false);
  });

  it("rejects the static brand asset namespace as a listing route", () => {
    const snapshot = getSnapshot();
    snapshot.listings[0]!.slug = "brands";

    expect(storefrontSnapshotSchema.safeParse(snapshot).success).toBe(false);
  });
});

describe("storefront inquiry contract", () => {
  const person = {
    name: "Garden Visitor",
    email: "visitor@example.com",
    website: "",
    openedAt: "2026-08-29T12:00:00.000Z",
  };

  it("requires a contact message and rejects cart-only or unknown fields", () => {
    expect(
      inquirySchema.safeParse({
        ...person,
        kind: "contact",
        message: "Do you ship this cultivar?",
      }).success,
    ).toBe(true);
    expect(
      inquirySchema.safeParse({ ...person, kind: "contact" }).success,
    ).toBe(false);
    expect(
      inquirySchema.safeParse({
        ...person,
        kind: "contact",
        message: "Hello",
        lines: [],
      }).success,
    ).toBe(false);
  });

  it("requires cart lines and defaults its optional message", () => {
    const result = inquirySchema.safeParse({
      ...person,
      kind: "cart",
      lines: [
        {
          listingId: "listing-1",
          slug: "quiet-snow",
          title: "Quiet Snow",
          quantity: 2,
          unitPrice: 20,
        },
      ],
      subtotal: 40,
      shipping: 15,
      total: 55,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.message).toBe("");

    expect(
      inquirySchema.safeParse({
        ...person,
        kind: "cart",
        lines: [],
        subtotal: 0,
        shipping: 0,
        total: 1,
      }).success,
    ).toBe(false);
  });

  it("accepts only the exact inquiry receipt", () => {
    const receipt = {
      id: "inquiry-1",
      acceptedAt: "2026-08-29T12:00:01.000Z",
    };
    expect(inquiryReceiptSchema.safeParse(receipt).success).toBe(true);
    expect(
      inquiryReceiptSchema.safeParse({ ...receipt, status: "accepted" })
        .success,
    ).toBe(false);
    expect(
      inquiryReceiptSchema.safeParse({
        id: "inquiry-1",
        acceptedAt: "not-a-date",
      }).success,
    ).toBe(false);
  });
});
