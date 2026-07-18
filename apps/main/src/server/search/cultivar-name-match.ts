import "server-only";

import { createClient } from "@libsql/client";
import { areGeneratedCultivarImageAssetsEnabledByDefault } from "@/config/feature-flags";
import type {
  CultivarMatchCandidate,
  CultivarNameMatchResult,
} from "@/lib/catalog-importer";
import {
  getCultivarMatchConfidence,
  toLooseCultivarMatchText,
} from "@/lib/cultivar-match-score";
import { normalizeCultivarName } from "@/lib/utils/cultivar-utils";
import {
  ensurePublicSearchIndex,
  getPublicSearchIndexPath,
  isPublicSearchIndexUsable,
  PublicSearchIndexUnavailableError,
} from "@/server/search/public-search-index";

export const MAX_CULTIVAR_MATCH_NAMES = 250;
export const MAX_CULTIVAR_MATCH_NAME_LENGTH = 160;

interface CultivarMatchRow {
  awardNames: string | null;
  bloomHabit: string | null;
  bloomSizeIn: number | null;
  bloomSeason: string | null;
  branches: number | null;
  budCount: number | null;
  color: string | null;
  cultivarReferenceId: string;
  displayName: string;
  foliageType: string | null;
  flowerShow: string | null;
  form: string | null;
  fragrance: string | null;
  hybridizer: string | null;
  imageAsset: CultivarMatchCandidate["imageAsset"];
  imageUrl: string | null;
  listingCount: number;
  normalizedName: string;
  parentage: string | null;
  ploidy: string | null;
  rebloom: boolean | null;
  scapeHeightIn: number | null;
  sculptedTypes: string | null;
  year: number | null;
}

const COMMON_MATCH_TOKENS = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "my",
  "of",
  "on",
  "the",
  "to",
]);

function toStringOrNull(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toRequiredString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toMatchRow(row: Record<string, unknown>): CultivarMatchRow {
  const generatedImageUrl = toStringOrNull(row.generatedImageUrl);
  const generatedImageAssetId = toStringOrNull(row.generatedImageAssetId);
  const fallbackImageUrl =
    toStringOrNull(row.fallbackImageUrl) ?? toStringOrNull(row.imageUrl);
  const usesGeneratedImage = Boolean(
    areGeneratedCultivarImageAssetsEnabledByDefault() &&
      generatedImageUrl &&
      generatedImageAssetId,
  );

  return {
    awardNames: toStringOrNull(row.awardNames),
    bloomHabit: toStringOrNull(row.bloomHabit),
    bloomSizeIn: typeof row.bloomSizeIn === "number" ? row.bloomSizeIn : null,
    bloomSeason: toStringOrNull(row.bloomSeason),
    branches: typeof row.branches === "number" ? row.branches : null,
    budCount: typeof row.budCount === "number" ? row.budCount : null,
    color: toStringOrNull(row.color),
    cultivarReferenceId: toRequiredString(row.cultivarReferenceId),
    displayName: toRequiredString(row.displayName),
    foliageType: toStringOrNull(row.foliageType),
    flowerShow: toStringOrNull(row.flowerShow),
    form: toStringOrNull(row.form),
    fragrance: toStringOrNull(row.fragrance),
    hybridizer: toStringOrNull(row.hybridizer),
    imageAsset:
      usesGeneratedImage && generatedImageAssetId
        ? {
            blurUrl: toStringOrNull(row.generatedBlurUrl),
            displayUrl: generatedImageUrl,
            id: generatedImageAssetId,
            originalUrl: toStringOrNull(row.generatedOriginalUrl),
            status: "ready",
            thumbUrl: toStringOrNull(row.generatedThumbUrl),
          }
        : null,
    imageUrl: usesGeneratedImage ? generatedImageUrl : fallbackImageUrl,
    listingCount: typeof row.listingCount === "number" ? row.listingCount : 0,
    normalizedName: toRequiredString(row.normalizedName),
    parentage: toStringOrNull(row.parentage),
    ploidy: toStringOrNull(row.ploidy),
    rebloom: row.rebloom === null ? null : Boolean(row.rebloom),
    scapeHeightIn:
      typeof row.scapeHeightIn === "number" ? row.scapeHeightIn : null,
    sculptedTypes: toStringOrNull(row.sculptedTypes),
    year: typeof row.yearInt === "number" ? row.yearInt : null,
  };
}

function toCandidate(
  row: CultivarMatchRow,
  confidence: number,
): CultivarMatchCandidate {
  return {
    awardNames: row.awardNames,
    bloomHabit: row.bloomHabit,
    bloomSizeIn: row.bloomSizeIn,
    bloomSeason: row.bloomSeason,
    branches: row.branches,
    budCount: row.budCount,
    color: row.color,
    confidence,
    cultivarReferenceId: row.cultivarReferenceId,
    displayName: row.displayName,
    foliageType: row.foliageType,
    flowerShow: row.flowerShow,
    form: row.form,
    fragrance: row.fragrance,
    hybridizer: row.hybridizer,
    imageAsset: row.imageAsset,
    imageUrl: row.imageUrl,
    listingCount: row.listingCount,
    normalizedName: row.normalizedName,
    parentage: row.parentage,
    ploidy: row.ploidy,
    rebloom: row.rebloom,
    scapeHeightIn: row.scapeHeightIn,
    sculptedTypes: row.sculptedTypes,
    year: row.year,
  };
}

function getFtsCandidateQuery(inputName: string) {
  const allTokens = toLooseCultivarMatchText(inputName)
    .split(" ")
    .filter((token) => token.length >= 2);
  const usefulTokens = allTokens.filter(
    (token) => !COMMON_MATCH_TOKENS.has(token),
  );
  const tokens = usefulTokens.length > 0 ? usefulTokens : allTokens;

  return tokens
    .slice(0, 8)
    .map((token) => `"${token.replaceAll('"', '""')}"`)
    .join(" OR ");
}

async function getPotentialMatches(
  client: ReturnType<typeof createClient>,
  inputName: string,
) {
  const normalizedInput = normalizeCultivarName(inputName);
  if (!normalizedInput) {
    return [];
  }

  const rowsByCultivar = new Map<string, CultivarMatchRow>();
  const ftsQuery = getFtsCandidateQuery(inputName);

  if (ftsQuery) {
    const ftsResult = await client.execute({
      args: [ftsQuery],
      sql: `
        SELECT
          i.cultivarReferenceId,
          i.normalizedName,
          i.displayName,
          i.hybridizer,
          i.awardNames,
          i.yearInt,
          i.scapeHeightIn,
          i.bloomSizeIn,
          i.budCount,
          i.branches,
          i.bloomSeason,
          i.bloomHabit,
          i.form,
          i.flowerShow,
          i.sculptedTypes,
          i.ploidy,
          i.foliageType,
          i.fragrance,
          i.color,
          i.parentage,
          i.rebloom,
          i.imageUrl,
          i.generatedImageAssetId,
          i.generatedImageUrl,
          i.generatedOriginalUrl,
          i.generatedThumbUrl,
          i.generatedBlurUrl,
          i.fallbackImageUrl,
          i.listingCount
        FROM CultivarSearchFts f
        JOIN CultivarSearchIndex i ON i.id = f.rowid
        WHERE CultivarSearchFts MATCH ?
        ORDER BY bm25(CultivarSearchFts, 8.0, 6.0, 2.0, 0.5, 0.5)
        LIMIT 160
      `,
    });

    for (const row of ftsResult.rows) {
      const matchRow = toMatchRow(row);
      rowsByCultivar.set(matchRow.cultivarReferenceId, matchRow);
    }
  }

  if (rowsByCultivar.size < 12) {
    const looseInput = toLooseCultivarMatchText(inputName);
    const fallbackResult = await client.execute({
      args: [looseInput.length, looseInput.charAt(0)],
      sql: `
        SELECT
          cultivarReferenceId,
          normalizedName,
          displayName,
          hybridizer,
          awardNames,
          yearInt,
          scapeHeightIn,
          bloomSizeIn,
          budCount,
          branches,
          bloomSeason,
          bloomHabit,
          form,
          flowerShow,
          sculptedTypes,
          ploidy,
          foliageType,
          fragrance,
          color,
          parentage,
          rebloom,
          imageUrl,
          generatedImageAssetId,
          generatedImageUrl,
          generatedOriginalUrl,
          generatedThumbUrl,
          generatedBlurUrl,
          fallbackImageUrl,
          listingCount
        FROM CultivarSearchIndex
        WHERE ABS(length(displayNameSearch) - ?) <= 4
          AND substr(displayNameSearch, 1, 1) = ?
        ORDER BY displayName COLLATE NOCASE ASC
        LIMIT 500
      `,
    });

    for (const row of fallbackResult.rows) {
      const matchRow = toMatchRow(row);
      rowsByCultivar.set(matchRow.cultivarReferenceId, matchRow);
    }
  }

  return [...rowsByCultivar.values()]
    .map((row) =>
      toCandidate(row, getCultivarMatchConfidence(inputName, row.displayName)),
    )
    .filter((candidate) => candidate.confidence >= 50)
    .sort(
      (left, right) =>
        right.confidence - left.confidence ||
        left.displayName.localeCompare(right.displayName),
    )
    .slice(0, 5);
}

export async function matchCultivarNames({
  cultivarReferenceIds,
  includeCandidates,
  names,
}: {
  cultivarReferenceIds?: Array<string | null>;
  includeCandidates: boolean;
  names: string[];
}): Promise<CultivarNameMatchResult[]> {
  const searchIndexStatus = await ensurePublicSearchIndex();
  if (!isPublicSearchIndexUsable(searchIndexStatus)) {
    throw new PublicSearchIndexUnavailableError(searchIndexStatus);
  }

  const normalizedNames = [
    ...new Set(
      names
        .map((name) => normalizeCultivarName(name))
        .filter((name): name is string => Boolean(name)),
    ),
  ];
  const client = createClient({
    url: `file:${getPublicSearchIndexPath()}`,
  });

  try {
    const exactMatches = new Map<string, CultivarMatchRow>();
    const referenceMatches = new Map<string, CultivarMatchRow>();

    if (normalizedNames.length > 0) {
      const exactResult = await client.execute({
        args: normalizedNames,
        sql: `
          SELECT
            cultivarReferenceId,
            normalizedName,
            displayName,
            hybridizer,
            awardNames,
            yearInt,
            scapeHeightIn,
            bloomSizeIn,
            budCount,
            branches,
            bloomSeason,
            bloomHabit,
            form,
            flowerShow,
            sculptedTypes,
            ploidy,
            foliageType,
            fragrance,
            color,
            parentage,
            rebloom,
            imageUrl,
            generatedImageAssetId,
            generatedImageUrl,
            generatedOriginalUrl,
            generatedThumbUrl,
            generatedBlurUrl,
            fallbackImageUrl,
            listingCount
          FROM CultivarSearchIndex
          WHERE normalizedName IN (${normalizedNames.map(() => "?").join(", ")})
        `,
      });

      for (const row of exactResult.rows) {
        const matchRow = toMatchRow(row);
        exactMatches.set(matchRow.normalizedName, matchRow);
      }
    }

    const uniqueReferenceIds = [
      ...new Set(
        (cultivarReferenceIds ?? []).filter((value): value is string =>
          Boolean(value),
        ),
      ),
    ];
    if (uniqueReferenceIds.length > 0) {
      const referenceResult = await client.execute({
        args: uniqueReferenceIds,
        sql: `
          SELECT
            cultivarReferenceId,
            normalizedName,
            displayName,
            hybridizer,
            awardNames,
            yearInt,
            scapeHeightIn,
            bloomSizeIn,
            budCount,
            branches,
            bloomSeason,
            bloomHabit,
            form,
            flowerShow,
            sculptedTypes,
            ploidy,
            foliageType,
            fragrance,
            color,
            parentage,
            rebloom,
            imageUrl,
            generatedImageAssetId,
            generatedImageUrl,
            generatedOriginalUrl,
            generatedThumbUrl,
            generatedBlurUrl,
            fallbackImageUrl,
            listingCount
          FROM CultivarSearchIndex
          WHERE cultivarReferenceId IN (${uniqueReferenceIds.map(() => "?").join(", ")})
        `,
      });

      for (const row of referenceResult.rows) {
        const matchRow = toMatchRow(row);
        referenceMatches.set(matchRow.cultivarReferenceId, matchRow);
      }
    }

    const results: CultivarNameMatchResult[] = [];

    for (const [index, inputName] of names.entries()) {
      const normalizedInput = normalizeCultivarName(inputName);
      const inputCultivarReferenceId = cultivarReferenceIds?.[index] ?? null;
      const referenceRow = inputCultivarReferenceId
        ? (referenceMatches.get(inputCultivarReferenceId) ?? null)
        : null;
      const exactRow = inputCultivarReferenceId
        ? referenceRow
        : normalizedInput
          ? (exactMatches.get(normalizedInput) ?? null)
          : null;
      const exactMatch = exactRow ? toCandidate(exactRow, 100) : null;
      const candidates =
        inputCultivarReferenceId && !exactMatch
          ? []
          : includeCandidates && !exactMatch
            ? await getPotentialMatches(client, inputName)
            : exactMatch
              ? [exactMatch]
              : [];

      results.push({
        candidates,
        exactMatch,
        inputCultivarReferenceId,
        inputName,
        invalidCultivarReferenceId:
          inputCultivarReferenceId && !exactMatch
            ? inputCultivarReferenceId
            : null,
        normalizedInput,
      });
    }

    return results;
  } finally {
    client.close();
  }
}
