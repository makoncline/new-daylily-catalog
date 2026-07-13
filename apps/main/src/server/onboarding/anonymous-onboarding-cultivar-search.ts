import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { normalizeCultivarName } from "@/lib/utils/cultivar-utils";
import {
  getDisplayAhsListing,
  v2AhsCultivarDisplaySelect,
} from "@/lib/utils/ahs-display";
import { generatedCultivarImageAssetInclude } from "@/server/services/cultivar-reference-image-read-model";
import { resolveCultivarReferenceImage } from "@/server/services/cultivar-reference-image-read-model";

export const anonymousCultivarSearchInputSchema = z.object({
  query: z.string().trim().min(3).max(80),
});

export async function searchAnonymousOnboardingCultivars(
  db: PrismaClient,
  query: string,
) {
  const normalizedQuery = normalizeCultivarName(query);
  if (!normalizedQuery) return [];

  const rows = await db.cultivarReference.findMany({
    where: {
      v2AhsCultivar: { isNot: null },
      OR: [
        { normalizedName: { startsWith: normalizedQuery } },
        {
          v2AhsCultivar: {
            is: { link_normalized_name: { startsWith: normalizedQuery } },
          },
        },
      ],
    },
    take: 12,
    orderBy: { normalizedName: "asc" },
    select: {
      id: true,
      normalizedName: true,
      v2AhsCultivar: { select: v2AhsCultivarDisplaySelect },
      imageAssets: generatedCultivarImageAssetInclude,
    },
  });

  return rows.flatMap((row) => {
    const cultivar = getDisplayAhsListing(row);
    if (!cultivar?.name) return [];
    const image = resolveCultivarReferenceImage({
      id: `cultivar-${row.id}`,
      fallbackImageUrl: cultivar.ahsImageUrl,
      imageAssets: row.imageAssets,
    });

    return [
      {
        cultivarReferenceId: row.id,
        normalizedName: row.normalizedName,
        ...cultivar,
        name: cultivar.name,
        image,
      },
    ];
  });
}
