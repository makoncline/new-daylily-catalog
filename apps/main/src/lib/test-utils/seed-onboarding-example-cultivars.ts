import type { PrismaClient } from "@prisma/client";
import { ONBOARDING_EXAMPLE_CULTIVAR_REFERENCE_IDS } from "@/app/onboarding/anonymous-onboarding-config";

const ONBOARDING_EXAMPLE_CULTIVAR_SEEDS = [
  {
    id: "77248",
    postId: "114795",
    referenceId: ONBOARDING_EXAMPLE_CULTIVAR_REFERENCE_IDS[0],
    normalizedName: "coffee frenzy",
    name: "Coffee Frenzy",
    hybridizer: "Kay Cline",
    introductionDate: "2014-09-22",
    imageUrl:
      "https://daylily-wordpress-dev.s3.us-east-2.amazonaws.com/wp-content/uploads/20250808202213/Coffee-Frenzy.jpg",
  },
  {
    id: "23741",
    postId: "30673",
    referenceId: ONBOARDING_EXAMPLE_CULTIVAR_REFERENCE_IDS[1],
    normalizedName: "happy returns",
    name: "Happy Returns",
    hybridizer: "Darrel A. Apps",
    introductionDate: "1986-01-01",
    imageUrl:
      "https://daylily-wordpress-dev.s3.us-east-2.amazonaws.com/wp-content/uploads/20250806121351/Happy_Returns.jpg",
  },
  {
    id: "7847",
    postId: "12901",
    referenceId: ONBOARDING_EXAMPLE_CULTIVAR_REFERENCE_IDS[2],
    normalizedName: "primal scream",
    name: "Primal Scream",
    hybridizer: "Curt Hanson",
    introductionDate: "1994-03-22",
    imageUrl:
      "https://daylily-wordpress-dev.s3.us-east-2.amazonaws.com/wp-content/uploads/20250812091039/Primal-Scream.jpg",
  },
] as const;

export async function seedOnboardingExampleCultivars(db: PrismaClient) {
  for (const example of ONBOARDING_EXAMPLE_CULTIVAR_SEEDS) {
    await db.v2AhsCultivar.create({
      data: {
        id: example.id,
        post_id: example.postId,
        link_normalized_name: example.normalizedName,
        post_title: example.name,
        introduction_date: example.introductionDate,
        primary_hybridizer_name: example.hybridizer,
        image_url: example.imageUrl,
      },
    });
    await db.cultivarReference.create({
      data: {
        id: example.referenceId,
        normalizedName: null,
        v2AhsCultivarId: example.id,
      },
    });
  }
}
