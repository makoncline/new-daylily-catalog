import "server-only";

import type { Prisma } from "@prisma/client";
import {
  v2AhsCultivarDisplaySelect,
  withResolvedDisplayAhsListing,
} from "@/lib/utils/ahs-display";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import {
  PUBLIC_CULTIVAR_SEARCH_LIMIT,
  type PublicCultivarSearchFilters,
  type PublicCultivarSearchResult,
} from "@/lib/public-cultivar-search";
import { replicaDb } from "@/server/db";

type TextFacetField =
  | "bloom_habit_names"
  | "bloom_season_names"
  | "flower_form_names"
  | "foliage_names"
  | "fragrance_names"
  | "ploidy_names";

function addTextFacet(
  filters: Prisma.V2AhsCultivarWhereInput[],
  field: TextFacetField,
  values: string[] | undefined,
) {
  if (!values?.length) return;

  filters.push({
    OR: values.map((value) => ({
      [field]: { contains: value },
    })),
  });
}

function addNumberRange(
  filters: Prisma.V2AhsCultivarWhereInput[],
  field: "bloom_size_in" | "branches" | "bud_count" | "scape_height_in",
  min: number | undefined,
  max: number | undefined,
) {
  if (min === undefined && max === undefined) return;

  filters.push({
    [field]: {
      ...(min === undefined ? {} : { gte: min }),
      ...(max === undefined ? {} : { lte: max }),
    },
  });
}

export async function searchPublicCultivars(
  search: PublicCultivarSearchFilters,
): Promise<PublicCultivarSearchResult[]> {
  const filters: Prisma.V2AhsCultivarWhereInput[] = [
    {
      cultivarReference: {
        is: {
          normalizedName: { not: null },
        },
      },
    },
  ];
  const query = search.q?.trim();

  if (query) {
    filters.push({
      OR: [
        { post_title: { contains: query } },
        { link_normalized_name: { contains: query } },
        { primary_hybridizer_name: { contains: query } },
        { hybridizer_code_legacy: { contains: query } },
        { color: { contains: query } },
        { parentage: { contains: query } },
      ],
    });
  }

  if (search.hybridizer) {
    filters.push({
      OR: [
        { primary_hybridizer_name: { contains: search.hybridizer } },
        { hybridizer_code_legacy: { contains: search.hybridizer } },
      ],
    });
  }

  if (search.color) {
    filters.push({ color: { contains: search.color } });
  }
  if (search.parentage) {
    filters.push({ parentage: { contains: search.parentage } });
  }
  if (search.hasPhoto) {
    filters.push({ image_url: { not: "" } });
  }
  if (search.yearMin !== undefined || search.yearMax !== undefined) {
    filters.push({
      introduction_date: {
        ...(search.yearMin === undefined
          ? {}
          : { gte: String(Math.trunc(search.yearMin)) }),
        ...(search.yearMax === undefined
          ? {}
          : { lt: String(Math.trunc(search.yearMax) + 1) }),
      },
    });
  }

  addTextFacet(filters, "bloom_habit_names", search.bloomHabit);
  addTextFacet(filters, "bloom_season_names", search.bloomSeason);
  addTextFacet(filters, "flower_form_names", search.form);
  addTextFacet(filters, "foliage_names", search.foliageType);
  addTextFacet(filters, "fragrance_names", search.fragrance);
  addTextFacet(filters, "ploidy_names", search.ploidy);
  addNumberRange(
    filters,
    "bloom_size_in",
    search.bloomSizeMin,
    search.bloomSizeMax,
  );
  addNumberRange(
    filters,
    "scape_height_in",
    search.scapeHeightMin,
    search.scapeHeightMax,
  );
  addNumberRange(
    filters,
    "bud_count",
    search.budcountMin,
    search.budcountMax,
  );
  addNumberRange(
    filters,
    "branches",
    search.branchesMin,
    search.branchesMax,
  );

  const cultivars = await replicaDb.v2AhsCultivar.findMany({
    where: { AND: filters },
    select: {
      ...v2AhsCultivarDisplaySelect,
      cultivarReference: {
        select: {
          normalizedName: true,
        },
      },
    },
    orderBy: [{ post_title: "asc" }, { id: "asc" }],
    take: PUBLIC_CULTIVAR_SEARCH_LIMIT,
  });

  return cultivars.flatMap((cultivar) => {
    const normalizedName = cultivar.cultivarReference?.normalizedName;
    const segment = toCultivarRouteSegment(normalizedName);
    if (!normalizedName || !segment) return [];

    const resolved = withResolvedDisplayAhsListing({
      normalizedName,
      v2AhsCultivar: cultivar,
    });

    return [
      {
        ahsListing: resolved.ahsListing,
        hybridizer: resolved.ahsListing?.hybridizer ?? null,
        imageUrl: resolved.ahsListing?.ahsImageUrl ?? null,
        name: resolved.ahsListing?.name ?? normalizedName,
        normalizedName,
        segment,
        year: resolved.ahsListing?.year ?? null,
      },
    ];
  });
}
