import "server-only";

import {
  buildOnboardingExampleCultivars,
  onboardingCultivarReferenceSelect,
} from "./anonymous-onboarding-example-cultivar-builder";
import { db, replicaDb } from "@/server/db";
import {
  ONBOARDING_EXAMPLE_CULTIVAR_REFERENCE_IDS,
  type ExampleCultivar,
} from "./anonymous-onboarding-config";

export async function getOnboardingExampleCultivars(): Promise<
  ExampleCultivar[]
> {
  const cultivarReferenceIds = ONBOARDING_EXAMPLE_CULTIVAR_REFERENCE_IDS;
  const readDb = replicaDb ?? db;
  const rows = await readDb.cultivarReference.findMany({
    where: {
      id: {
        in: [...cultivarReferenceIds],
      },
    },
    select: onboardingCultivarReferenceSelect,
  });
  const exampleCultivars = buildOnboardingExampleCultivars(
    rows,
    cultivarReferenceIds,
  );

  if (exampleCultivars.length !== cultivarReferenceIds.length) {
    const resolvedIds = new Set(exampleCultivars.map((cultivar) => cultivar.key));
    const missingIds = cultivarReferenceIds.filter((id) => !resolvedIds.has(id));
    throw new Error(
      `Onboarding example cultivar references are missing display data or images: ${missingIds.join(
        ", ",
      )}`,
    );
  }

  return exampleCultivars;
}
