import type { PrismaClient } from "@prisma/client";
import { ONBOARDING_EXAMPLE_CULTIVAR_REFERENCE_IDS } from "@/app/onboarding/anonymous-onboarding-config";

const GENERATED_CULTIVAR_MEDIA_BASE_URL = "https://media.daylilycatalog.com";

function generatedCultivarImageAsset(args: {
  id: string;
  sourceCultivarReferenceId: string;
  sourceImageAssetId: string;
}) {
  const baseKey = `cultivars/${args.sourceCultivarReferenceId}/${args.sourceImageAssetId}`;

  return {
    id: args.id,
    originalKey: `${baseKey}/original.png`,
    originalUrl: `${GENERATED_CULTIVAR_MEDIA_BASE_URL}/${baseKey}/original.png`,
    displayKey: `${baseKey}/display-800.webp`,
    displayUrl: `${GENERATED_CULTIVAR_MEDIA_BASE_URL}/${baseKey}/display-800.webp`,
    thumbKey: `${baseKey}/thumb-200.webp`,
    thumbUrl: `${GENERATED_CULTIVAR_MEDIA_BASE_URL}/${baseKey}/thumb-200.webp`,
    blurKey: `${baseKey}/blur-20.webp`,
    blurUrl: `${GENERATED_CULTIVAR_MEDIA_BASE_URL}/${baseKey}/blur-20.webp`,
  };
}

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
    imageAsset: generatedCultivarImageAsset({
      id: "onboarding-generated-coffee-frenzy",
      sourceCultivarReferenceId: "cr-ahs-176320",
      sourceImageAssetId: "cmqk1l57201nc25rkjmj9ngch",
    }),
  },
  {
    id: "71522",
    postId: "103531",
    referenceId: ONBOARDING_EXAMPLE_CULTIVAR_REFERENCE_IDS[1],
    normalizedName: "lemon chiffon cupcake",
    name: "Lemon Chiffon Cupcake",
    hybridizer: "Tim Herrington",
    introductionDate: "2012-06-25",
    imageUrl:
      "https://daylily-wordpress-dev.s3.us-east-2.amazonaws.com/wp-content/uploads/20250808175627/LEMON-CHIFFON-CUPCAKE.jpg",
    imageAsset: generatedCultivarImageAsset({
      id: "onboarding-generated-lemon-chiffon-cupcake",
      sourceCultivarReferenceId: "cr-ahs-170157",
      sourceImageAssetId: "cmqk1ejs901as25rkmi211vct",
    }),
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
    imageAsset: generatedCultivarImageAsset({
      id: "onboarding-generated-primal-scream",
      sourceCultivarReferenceId: "cr-ahs-8527",
      sourceImageAssetId: "cmqk34trx04pw25rk4iy723uq",
    }),
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
    await db.imageAsset.create({
      data: {
        id: example.imageAsset.id,
        order: 0,
        kind: "cultivar",
        status: "ready",
        cultivarReferenceId: example.referenceId,
        originalKey: example.imageAsset.originalKey,
        originalUrl: example.imageAsset.originalUrl,
        displayKey: example.imageAsset.displayKey,
        displayUrl: example.imageAsset.displayUrl,
        thumbKey: example.imageAsset.thumbKey,
        thumbUrl: example.imageAsset.thumbUrl,
        blurKey: example.imageAsset.blurKey,
        blurUrl: example.imageAsset.blurUrl,
      },
    });
  }
}
