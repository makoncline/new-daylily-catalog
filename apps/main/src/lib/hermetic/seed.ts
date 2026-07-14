import type { PrismaClient } from "@prisma/client";
import { HERMETIC_PERSONAS } from "./personas.js";

type PersonaKey = keyof typeof HERMETIC_PERSONAS;

const profiles: Record<PersonaKey, { slug: string; listingCount: number }> = {
  "pro-primary": { slug: "hermetic-pro-garden", listingCount: 36 },
  "pro-secondary": { slug: "hermetic-second-garden", listingCount: 12 },
  "new-unpaid": { slug: "hermetic-new-seller", listingCount: 0 },
  "free-at-limit": { slug: "hermetic-free-at-limit", listingCount: 25 },
  "billing-past-due": { slug: "hermetic-past-due-garden", listingCount: 0 },
  "billing-canceled": { slug: "hermetic-canceled-garden", listingCount: 0 },
  "workflow-seller": { slug: "hermetic-workflow-garden", listingCount: 5 },
  "profile-editor": { slug: "hermetic-profile-garden", listingCount: 2 },
  "checkout-unpaid": { slug: "hermetic-checkout-garden", listingCount: 0 },
};

export async function resetHermeticData(db: PrismaClient) {
  await db.$transaction([
    db.imageAsset.deleteMany(),
    db.image.deleteMany(),
    db.list.deleteMany(),
    db.listing.deleteMany(),
    db.userProfile.deleteMany(),
    db.cultivarReference.deleteMany(),
    db.v2AhsCultivar.deleteMany(),
    db.ahsListing.deleteMany(),
    db.keyValue.deleteMany(),
    db.user.deleteMany(),
  ]);

  for (const cultivar of [
    [
      "hermetic-onboarding-coffee",
      "cr-ahs-176320",
      "Coffee Frenzy",
      "Kay Cline",
    ],
    [
      "hermetic-onboarding-lemon",
      "cr-ahs-170157",
      "Lemon Chiffon Cupcake",
      "Tim Herrington",
    ],
    [
      "hermetic-onboarding-primal",
      "cr-ahs-8527",
      "Primal Scream",
      "Curt Hanson",
    ],
  ] as const) {
    await db.v2AhsCultivar.create({
      data: {
        id: cultivar[0],
        post_id: `post-${cultivar[0]}`,
        link_normalized_name: cultivar[2].toLowerCase(),
        post_title: cultivar[2],
        post_status: "publish",
        primary_hybridizer_name: cultivar[3],
        introduction_date: "2020-01-01",
        image_url: "/assets/onboarding-generated/listing-fallback.png",
        last_updated: "2026-07-11 12:00:00",
      },
    });
    await db.cultivarReference.create({
      data: {
        id: cultivar[1],
        normalizedName: cultivar[2].toLowerCase(),
        v2AhsCultivarId: cultivar[0],
      },
    });
  }

  for (const cultivar of [
    ["hermetic-v2-create", "hermetic create bloom", "Hermetic Create Bloom"],
    ["hermetic-v2-relink", "hermetic relink bloom", "Hermetic Relink Bloom"],
  ] as const) {
    await db.v2AhsCultivar.create({
      data: {
        id: cultivar[0],
        post_id: `post-${cultivar[0]}`,
        link_normalized_name: cultivar[1],
        post_title: cultivar[2],
        post_status: "publish",
        primary_hybridizer_name: "Offline",
        introduction_date: "2024-01-01",
        color: "Gold",
        last_updated: "2026-07-11 12:00:00",
      },
    });
    await db.cultivarReference.create({
      data: {
        id: `cr-${cultivar[0]}`,
        normalizedName: cultivar[1],
        v2AhsCultivarId: cultivar[0],
      },
    });
  }

  for (const persona of Object.values(HERMETIC_PERSONAS)) {
    const profile = profiles[persona.key];
    const customerId = `cus_hermetic_${persona.key.replaceAll("-", "_")}`;
    const noBilling = persona.subscriptionStatus === "none";
    const blank =
      persona.key === "new-unpaid" || persona.key === "checkout-unpaid";
    const user = await db.user.create({
      data: {
        clerkUserId: persona.clerkUserId,
        stripeCustomerId: noBilling ? null : customerId,
        profile: {
          create: {
            title: blank ? null : persona.name,
            slug: profile.slug,
            description: blank
              ? null
              : `Deterministic offline catalog for ${persona.name}.`,
            location: blank ? null : "Hermetic, Local",
          },
        },
      },
    });
    await db.keyValue.createMany({
      data: [
        {
          key: `clerk:user:${persona.clerkUserId}`,
          value: JSON.stringify({
            id: persona.clerkUserId,
            firstName: persona.name,
            imageUrl: "",
            primaryEmailAddress: { emailAddress: persona.email },
            email: persona.email,
            createdAt:
              persona.key === "new-unpaid" ? Number.MAX_SAFE_INTEGER : 0,
          }),
        },
        ...(noBilling
          ? []
          : [
              {
                key: `stripe:customer:${customerId}`,
                value: JSON.stringify({ status: persona.subscriptionStatus }),
              },
            ]),
      ],
    });
    if (!profile.listingCount) continue;
    if (persona.key === "profile-editor") {
      const userProfile = await db.userProfile.findUniqueOrThrow({
        where: { userId: user.id },
        select: { id: true },
      });
      await db.image.create({
        data: {
          id: "hermetic-profile-editor-image",
          userProfileId: userProfile.id,
          order: 0,
          url: "/assets/catalog-blooms.webp",
        },
      });
    }
    const list = await db.list.create({
      data: {
        id: `hermetic-list-${persona.key}-featured`,
        userId: user.id,
        title: "Featured Flowers",
        description: "Seeded list for offline full-app testing.",
        status: "PUBLISHED",
      },
    });
    for (let index = 1; index <= profile.listingCount; index += 1) {
      await db.listing.create({
        data: {
          id: `hermetic-listing-${persona.key}-${index}`,
          userId: user.id,
          title: `${persona.name} Daylily ${String(index).padStart(2, "0")}`,
          slug: `seeded-daylily-${index}`,
          description: `Offline listing ${index} for filters, pagination, and editing.`,
          privateNote: `Private hermetic note ${index}`,
          price: 10 + index,
          status: index % 5 === 0 ? "HIDDEN" : "AVAILABLE",
          cultivarReferenceId:
            persona.key === "pro-primary" && index === 1
              ? "cr-hermetic-v2-create"
              : null,
          lists: index <= 5 ? { connect: { id: list.id } } : undefined,
        },
      });
    }
    if (persona.key === "pro-primary") {
      await db.image.createMany({
        data: [1, 2, 3].map((index) => ({
          id: `hermetic-image-${index}`,
          listingId: "hermetic-listing-pro-primary-1",
          order: index - 1,
          url: "/assets/catalog-blooms.webp",
        })),
      });
    }
  }
}
