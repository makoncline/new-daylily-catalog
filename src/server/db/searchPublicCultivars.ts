import type { PrismaClient } from "@prisma/client";
import { compareItems, rankItem, rankings } from "@tanstack/match-sorter-utils";
import {
  normalizeCultivarName,
  toCultivarRouteSegment,
} from "@/lib/utils/cultivar-utils";
import { reportError } from "@/lib/error-utils";
import type { PublicCultivarSearchResult } from "@/types";

interface SearchPublicCultivarsOptions {
  take?: number;
}

function getDisplayCultivarName(row: {
  id: string;
  ahsId: string | null;
  normalizedName: string | null;
  ahsListing: { name: string | null } | null;
}) {
  if (row.ahsListing?.name) {
    return row.ahsListing.name;
  }

  if (row.normalizedName) {
    reportError({
      error: new Error(
        "AHS display name missing for cultivar reference search result; falling back to normalized name",
      ),
      level: "warning",
      context: {
        source: "searchPublicCultivars",
        cultivarReferenceId: row.id,
        ahsId: row.ahsId,
        normalizedName: row.normalizedName,
      },
    });

    return row.normalizedName;
  }

  reportError({
    error: new Error(
      "AHS display name and normalized name are both missing for cultivar reference search result",
    ),
    context: {
      source: "searchPublicCultivars",
      cultivarReferenceId: row.id,
      ahsId: row.ahsId,
    },
  });

  return null;
}

export async function searchPublicCultivars(
  db: PrismaClient,
  query: string,
  options?: SearchPublicCultivarsOptions,
): Promise<PublicCultivarSearchResult[]> {
  const normalizedQuery = normalizeCultivarName(query);

  if (!normalizedQuery) {
    return [];
  }

  const rows = await db.cultivarReference.findMany({
    where: {
      ahsId: { not: null },
      normalizedName: { startsWith: normalizedQuery },
    },
    take: options?.take ?? 8,
    orderBy: { normalizedName: "asc" },
    select: {
      id: true,
      ahsId: true,
      normalizedName: true,
      ahsListing: {
        select: {
          name: true,
        },
      },
    },
  });

  const sortedRows = rows.sort((a, b) => {
    const aRank = rankItem(a.normalizedName ?? "", normalizedQuery, {
      threshold: rankings.WORD_STARTS_WITH,
    });
    const bRank = rankItem(b.normalizedName ?? "", normalizedQuery, {
      threshold: rankings.WORD_STARTS_WITH,
    });

    if (aRank.passed && !bRank.passed) {
      return -1;
    }

    if (!aRank.passed && bRank.passed) {
      return 1;
    }

    return compareItems(aRank, bRank);
  });

  return sortedRows.flatMap((row) => {
    if (!row.ahsId || !row.normalizedName) {
      return [];
    }

    const segment = toCultivarRouteSegment(row.normalizedName);
    const name = getDisplayCultivarName(row);

    if (!segment || !name) {
      return [];
    }

    return [
      {
        id: row.ahsId,
        name,
        cultivarReferenceId: row.id,
        normalizedName: row.normalizedName,
        segment,
      },
    ];
  });
}
