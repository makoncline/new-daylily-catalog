import "server-only";

import { createClient, type InValue } from "@libsql/client";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import {
  ensurePublicParentageIndex,
  getPublicParentageIndexPath,
} from "@/server/search/public-parentage-index";
import {
  ensurePublicSearchIndex,
  getPublicSearchIndexPath,
  isPublicSearchIndexUsable,
  PublicSearchIndexUnavailableError,
} from "@/server/search/public-search-index";
import { areGeneratedCultivarImageAssetsEnabledByDefault } from "@/config/feature-flags";

export type CultivarSearchSort =
  | "relevance"
  | "name"
  | "newest"
  | "oldest"
  | "mostListed";

interface CultivarSearchArgs {
  award?: string;
  bloomHabit?: string;
  bloomSizeMax?: number;
  bloomSizeMin?: number;
  bloomSeason?: string;
  branchesMax?: number;
  branchesMin?: number;
  budCountMax?: number;
  budCountMin?: number;
  color?: string;
  cultivarName?: string;
  foliageType?: string;
  flowerShow?: string;
  form?: string;
  fragrance?: string;
  hasCultivarPhoto?: boolean;
  hasForSaleListings?: boolean;
  hasPhoto?: boolean;
  hasListings?: boolean;
  hybridizer?: string;
  limit?: number;
  listingLimit?: number;
  listingDescription?: string;
  listingTitle?: string;
  baseUrl: string;
  includeParentageTrees?: boolean;
  offset?: number;
  parentage?: string;
  photosFirst?: boolean;
  ploidy?: string;
  prefixLastToken?: boolean;
  priceMax?: number;
  priceMin?: number;
  q?: string;
  scapeHeightMax?: number;
  scapeHeightMin?: number;
  sculptedType?: string;
  sort?: CultivarSearchSort;
  yearMax?: number;
  yearMin?: number;
}

export type CultivarSearchFacet =
  | "award"
  | "flowerShow"
  | "hybridizer"
  | "sculptedType";

export interface CultivarSearchFacetOption {
  count: number;
  label: string;
  value: string;
}

interface CultivarAward {
  name: string;
  year: string | null;
  url: string | null;
}

interface ParentageTreeMatch {
  confidence: number | null;
  cultivarReferenceId: string;
  cultivarUrl: string | null;
  matchType: string;
  name: string;
  normalizedName: string;
}

interface ParentageTreeNode {
  children?: ParentageTreeNode[];
  confidence: number | null;
  match: ParentageTreeMatch | null;
  matchType: string;
  normalizedCandidate: string | null;
  rawText: string;
  type: string;
}

interface ParentageTree {
  raw: string;
  tree: ParentageTreeNode | null;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const DEFAULT_LISTING_LIMIT = 5;
const MAX_LISTING_LIMIT = 10;
const MAX_OFFSET = 200_000;
const SEARCH_TOKEN_REGEX = /[\p{L}\p{N}']+/gu;

function toStringOrNull(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toRequiredString(value: unknown, fallback = "") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function getLimit(rawLimit: number | undefined) {
  if (!rawLimit || !Number.isInteger(rawLimit)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(rawLimit, 1), MAX_LIMIT);
}

function getListingLimit(rawLimit: number | undefined) {
  if (rawLimit === undefined || !Number.isInteger(rawLimit)) {
    return DEFAULT_LISTING_LIMIT;
  }

  return Math.min(Math.max(rawLimit, 0), MAX_LISTING_LIMIT);
}

function getOffset(rawOffset: number | undefined) {
  if (!rawOffset || !Number.isInteger(rawOffset)) {
    return 0;
  }

  return Math.min(Math.max(rawOffset, 0), MAX_OFFSET);
}

function toFtsQuery(value: string | undefined, prefixLastToken = false) {
  if (!value) {
    return null;
  }

  const tokens = value.match(SEARCH_TOKEN_REGEX);
  if (!tokens?.length) {
    return null;
  }

  return tokens
    .map((token, index) => {
      const escapedToken = `"${token.replaceAll('"', '""')}"`;
      return prefixLastToken && index === tokens.length - 1
        ? `${escapedToken}*`
        : escapedToken;
    })
    .join(" ");
}

function toContainsQuery(value: string) {
  return `%${value.trim().toLowerCase()}%`;
}

function getOrderBy(args: {
  hasFtsQuery: boolean;
  photosFirst?: boolean;
  q?: string;
  sort?: CultivarSearchSort;
}) {
  const sort = args.sort ?? "relevance";
  const photoBoost = args.photosFirst
    ? "(i.generatedImageUrl IS NOT NULL) DESC, i.hasImage DESC, "
    : "";

  if (sort === "name") {
    return {
      params: [] as InValue[],
      sql: `${photoBoost}(substr(ltrim(i.displayName), 1, 1) GLOB '[0-9]') ASC, i.displayName COLLATE NOCASE ASC, i.id ASC`,
    };
  }

  if (sort === "newest") {
    return {
      params: [] as InValue[],
      sql: `${photoBoost}i.yearInt IS NULL ASC, i.yearInt DESC, i.displayName COLLATE NOCASE ASC, i.id ASC`,
    };
  }

  if (sort === "oldest") {
    return {
      params: [] as InValue[],
      sql: `${photoBoost}i.yearInt IS NULL ASC, i.yearInt ASC, i.displayName COLLATE NOCASE ASC, i.id ASC`,
    };
  }

  if (sort === "mostListed" || !args.hasFtsQuery) {
    return {
      params: [] as InValue[],
      sql: `${photoBoost}i.listingCount DESC, i.forSaleListingCount DESC, i.displayName COLLATE NOCASE ASC, i.id ASC`,
    };
  }

  const normalizedQuery = args.q?.trim().toLowerCase() ?? "";

  return {
    params: [normalizedQuery, `${normalizedQuery}%`] as InValue[],
    sql: `
      CASE
        WHEN i.displayNameSearch = ? THEN 0
        WHEN i.displayNameSearch LIKE ? THEN 1
        ELSE 2
      END,
      ${photoBoost}
      bm25(CultivarSearchFts, 8.0, 6.0, 3.0, 1.5, 0.5, 1.0),
      i.listingCount DESC,
      i.displayName COLLATE NOCASE ASC,
      i.id ASC
    `,
  };
}

function getMatchReason(args: {
  awardNames: string | null;
  color: string | null;
  displayName: string;
  hybridizer: string | null;
  parentage: string | null;
  q?: string;
}) {
  const query = args.q?.trim().toLowerCase();
  if (!query) return null;

  const displayName = args.displayName.toLowerCase();
  if (displayName === query) return "Exact cultivar";
  if (displayName.startsWith(query)) return "Cultivar name";
  if (args.hybridizer?.toLowerCase().includes(query)) return "Hybridizer";
  if (args.color?.toLowerCase().includes(query)) return "Color description";
  if (args.parentage?.toLowerCase().includes(query)) return "Parentage";
  if (args.awardNames?.toLowerCase().includes(query)) return "Award";
  return "Cultivar record";
}

function addNumberFilter(args: {
  params: InValue[];
  sql: string[];
  column: string;
  max?: number;
  min?: number;
}) {
  if (typeof args.min === "number" && Number.isFinite(args.min)) {
    args.sql.push(`i.${args.column} >= ?`);
    args.params.push(args.min);
  }

  if (typeof args.max === "number" && Number.isFinite(args.max)) {
    args.sql.push(`i.${args.column} <= ?`);
    args.params.push(args.max);
  }
}

function addTextFilter(args: {
  params: InValue[];
  sql: string[];
  columnSql: string;
  value?: string;
}) {
  if (!args.value?.trim()) {
    return;
  }

  const values = args.value
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);

  if (values.length === 0) {
    return;
  }

  if (values.length === 1) {
    args.sql.push(`${args.columnSql} LIKE ?`);
    args.params.push(toContainsQuery(values[0] ?? ""));
    return;
  }

  args.sql.push(
    `(${values.map(() => `${args.columnSql} LIKE ?`).join(" OR ")})`,
  );
  args.params.push(...values.map(toContainsQuery));
}

function addNormalizedExactValueFilter(args: {
  params: InValue[];
  sql: string[];
  columnSql: string;
  value?: string;
}) {
  const values = args.value
    ?.split("|")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (!values || values.length === 0) {
    return;
  }

  args.sql.push(`${args.columnSql} IN (${values.map(() => "?").join(", ")})`);
  args.params.push(...values);
}

function addAwardFilter(args: {
  params: InValue[];
  sql: string[];
  value?: string;
}) {
  const values = args.value
    ?.split("|")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (!values || values.length === 0) {
    return;
  }

  args.sql.push(`
    i.id IN (
      SELECT awardFilter.cultivarId
      FROM CultivarSearchAward awardFilter
      WHERE awardFilter.valueSearch IN (${values.map(() => "?").join(", ")})
    )
  `);
  args.params.push(...values);
}

function addSculptedTypeFilter(args: {
  params: InValue[];
  sql: string[];
  value?: string;
}) {
  const values = args.value
    ?.split("|")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (!values || values.length === 0) {
    return;
  }

  args.sql.push(`
    i.id IN (
      SELECT sculptedTypeFilter.cultivarId
      FROM CultivarSearchSculptedType sculptedTypeFilter
      WHERE sculptedTypeFilter.valueSearch IN (${values.map(() => "?").join(", ")})
    )
  `);
  args.params.push(...values);
}

function addFacetFilter(args: {
  columnSql: string;
  params: InValue[];
  sql: string[];
  specialClauses?: Record<string, string>;
  value?: string;
  valueAliases?: Record<string, string>;
}) {
  const values = args.value
    ?.split("|")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!values || values.length === 0) {
    return;
  }

  const normalizedColumn = `lower(replace(COALESCE(${args.columnSql}, ''), ', ', '|'))`;
  const clauses: string[] = [];
  const params: InValue[] = [];

  for (const value of values) {
    const normalizedValue = value.toLowerCase();
    const specialClause = args.specialClauses?.[normalizedValue];
    if (specialClause) {
      clauses.push(specialClause);
      continue;
    }

    const aliasedValue =
      args.valueAliases?.[normalizedValue] ?? normalizedValue;
    const escapedValue = aliasedValue
      .replaceAll("\\", "\\\\")
      .replaceAll("%", "\\%")
      .replaceAll("_", "\\_");
    clauses.push(`('|' || ${normalizedColumn} || '|') LIKE ? ESCAPE '\\'`);
    params.push(`%|${escapedValue}|%`);
  }

  args.sql.push(`(${clauses.join(" OR ")})`);
  args.params.push(...params);
}

function addListingExistsFilter(args: {
  params: InValue[];
  sql: string[];
  clauses: string[];
  values: InValue[];
}) {
  if (args.clauses.length === 0) {
    return;
  }

  args.sql.push(`
    EXISTS (
      SELECT 1
      FROM CultivarListingSearchIndex listingFilter
      WHERE listingFilter.cultivarReferenceId = i.cultivarReferenceId
        AND ${args.clauses.join(" AND ")}
    )
  `);
  args.params.push(...args.values);
}

function toNumberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseAwards(value: unknown): CultivarAward[] {
  if (typeof value !== "string" || value.length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((award) => {
      if (!award || typeof award !== "object") {
        return [];
      }

      const rawAward = award as Record<string, unknown>;
      const name = toStringOrNull(rawAward.name);
      if (!name) {
        return [];
      }

      return [
        {
          name,
          url: toStringOrNull(rawAward.award_url),
          year:
            typeof rawAward.year === "number"
              ? String(rawAward.year)
              : toStringOrNull(rawAward.year),
        },
      ];
    });
  } catch {
    return [];
  }
}

function getParentageParentPath(pathValue: string) {
  if (!pathValue) {
    return null;
  }

  const lastSeparator = pathValue.lastIndexOf(".");
  return lastSeparator === -1 ? "" : pathValue.slice(0, lastSeparator);
}

async function getParentageTrees(args: {
  baseUrl: string;
  cultivarReferenceIds: string[];
}) {
  const parentageByCultivar = new Map<string, ParentageTree>();

  if (args.cultivarReferenceIds.length === 0) {
    return parentageByCultivar;
  }

  const status = await ensurePublicParentageIndex();
  if (!status.exists || status.status === "expired") {
    return parentageByCultivar;
  }

  const client = createClient({
    url: `file:${getPublicParentageIndexPath()}`,
  });

  try {
    const result = await client.execute({
      args: args.cultivarReferenceIds,
      sql: `
        SELECT
          childCultivarReferenceId,
          path,
          nodeType,
          rawText,
          normalizedCandidate,
          matchType,
          matchedCultivarReferenceId,
          matchedNormalizedName,
          matchedDisplayName,
          confidence
        FROM CultivarParentageNode
        WHERE childCultivarReferenceId IN (${args.cultivarReferenceIds.map(() => "?").join(", ")})
        ORDER BY childCultivarReferenceId, path
      `,
    });

    const nodeMapsByCultivar = new Map<
      string,
      Map<string, ParentageTreeNode>
    >();

    for (const row of result.rows) {
      const childCultivarReferenceId = toRequiredString(
        row.childCultivarReferenceId,
      );
      const pathValue = toRequiredString(row.path);
      const matchType = toRequiredString(row.matchType, "none");
      const matchedNormalizedName = toStringOrNull(row.matchedNormalizedName);
      const matchedDisplayName = toStringOrNull(row.matchedDisplayName);
      const matchedCultivarReferenceId = toStringOrNull(
        row.matchedCultivarReferenceId,
      );
      const matchedSegment = matchedNormalizedName
        ? toCultivarRouteSegment(matchedNormalizedName)
        : null;
      const node: ParentageTreeNode = {
        confidence: toNumberOrNull(row.confidence),
        match:
          matchedCultivarReferenceId &&
          matchedNormalizedName &&
          matchedDisplayName
            ? {
                confidence: toNumberOrNull(row.confidence),
                cultivarReferenceId: matchedCultivarReferenceId,
                cultivarUrl: matchedSegment
                  ? `${args.baseUrl}/cultivar/${matchedSegment}`
                  : null,
                matchType,
                name: matchedDisplayName,
                normalizedName: matchedNormalizedName,
              }
            : null,
        matchType,
        normalizedCandidate: toStringOrNull(row.normalizedCandidate),
        rawText: toRequiredString(row.rawText),
        type: toRequiredString(row.nodeType, "cultivar"),
      };
      const nodeMap =
        nodeMapsByCultivar.get(childCultivarReferenceId) ??
        new Map<string, ParentageTreeNode>();

      nodeMap.set(pathValue, node);
      nodeMapsByCultivar.set(childCultivarReferenceId, nodeMap);
    }

    for (const [cultivarReferenceId, nodeMap] of nodeMapsByCultivar) {
      const sortedEntries = [...nodeMap.entries()].sort(
        ([leftPath], [rightPath]) =>
          leftPath.split(".").length - rightPath.split(".").length ||
          leftPath.localeCompare(rightPath),
      );

      for (const [pathValue, node] of sortedEntries) {
        const parentPath = getParentageParentPath(pathValue);
        if (parentPath === null) {
          continue;
        }

        const parent = nodeMap.get(parentPath);
        if (!parent) {
          continue;
        }

        parent.children ??= [];
        parent.children.push(node);
      }

      const root = nodeMap.get("") ?? null;
      parentageByCultivar.set(cultivarReferenceId, {
        raw: root?.rawText ?? "",
        tree: root,
      });
    }
  } finally {
    client.close();
  }

  return parentageByCultivar;
}

export async function searchCultivars(args: CultivarSearchArgs) {
  const searchIndexStatus = await ensurePublicSearchIndex();
  if (!isPublicSearchIndexUsable(searchIndexStatus)) {
    throw new PublicSearchIndexUnavailableError(searchIndexStatus);
  }

  const client = createClient({
    url: `file:${getPublicSearchIndexPath()}`,
  });
  const whereSql: string[] = [];
  const params: InValue[] = [];
  const ftsQuery = toFtsQuery(args.q, args.prefixLastToken);
  const fromSql = ftsQuery
    ? "CultivarSearchFts f JOIN CultivarSearchIndex i ON i.id = f.rowid"
    : "CultivarSearchIndex i";
  const orderBy = getOrderBy({
    hasFtsQuery: Boolean(ftsQuery),
    photosFirst: args.photosFirst,
    q: args.q,
    sort: args.sort,
  });

  if (ftsQuery) {
    whereSql.push("CultivarSearchFts MATCH ?");
    params.push(ftsQuery);
  }

  addNormalizedExactValueFilter({
    columnSql: "i.hybridizerSearch",
    params,
    sql: whereSql,
    value: args.hybridizer,
  });

  addTextFilter({
    columnSql: "i.displayNameSearch",
    params,
    sql: whereSql,
    value: args.cultivarName,
  });
  addAwardFilter({
    params,
    sql: whereSql,
    value: args.award,
  });
  addNormalizedExactValueFilter({
    columnSql: "i.flowerShowSearch",
    params,
    sql: whereSql,
    value: args.flowerShow,
  });
  addSculptedTypeFilter({
    params,
    sql: whereSql,
    value: args.sculptedType,
  });
  addFacetFilter({
    columnSql: "i.bloomHabit",
    params,
    sql: whereSql,
    specialClauses: { rebloom: "i.rebloom = 1" },
    value: args.bloomHabit,
  });
  addFacetFilter({
    columnSql: "i.bloomSeason",
    params,
    sql: whereSql,
    value: args.bloomSeason,
  });
  addTextFilter({
    columnSql: "lower(i.color)",
    params,
    sql: whereSql,
    value: args.color,
  });
  addFacetFilter({
    columnSql: "i.foliageType",
    params,
    sql: whereSql,
    value: args.foliageType,
  });
  addFacetFilter({
    columnSql: "i.form",
    params,
    sql: whereSql,
    value: args.form,
    valueAliases: { unusual: "unusual form" },
  });
  addFacetFilter({
    columnSql: "i.fragrance",
    params,
    sql: whereSql,
    value: args.fragrance,
  });
  addTextFilter({
    columnSql: "lower(i.parentage)",
    params,
    sql: whereSql,
    value: args.parentage,
  });
  addFacetFilter({
    columnSql: "i.ploidy",
    params,
    sql: whereSql,
    value: args.ploidy,
  });

  if (args.hasListings) {
    whereSql.push("i.listingCount > 0");
  }

  if (args.hasCultivarPhoto) {
    whereSql.push("i.hasImage = 1");
  }

  if (args.hasForSaleListings) {
    whereSql.push("i.forSaleListingCount > 0");
  }

  addNumberFilter({
    column: "yearInt",
    max: args.yearMax,
    min: args.yearMin,
    params,
    sql: whereSql,
  });
  addNumberFilter({
    column: "bloomSizeIn",
    max: args.bloomSizeMax,
    min: args.bloomSizeMin,
    params,
    sql: whereSql,
  });
  addNumberFilter({
    column: "scapeHeightIn",
    max: args.scapeHeightMax,
    min: args.scapeHeightMin,
    params,
    sql: whereSql,
  });
  addNumberFilter({
    column: "budCount",
    max: args.budCountMax,
    min: args.budCountMin,
    params,
    sql: whereSql,
  });
  addNumberFilter({
    column: "branches",
    max: args.branchesMax,
    min: args.branchesMin,
    params,
    sql: whereSql,
  });

  const listingFilterClauses: string[] = [];
  const listingFilterValues: InValue[] = [];

  if (args.listingTitle?.trim()) {
    listingFilterClauses.push("listingFilter.listingTitleSearch LIKE ?");
    listingFilterValues.push(toContainsQuery(args.listingTitle));
  }

  if (args.listingDescription?.trim()) {
    listingFilterClauses.push("listingFilter.listingDescriptionSearch LIKE ?");
    listingFilterValues.push(toContainsQuery(args.listingDescription));
  }

  if (args.hasPhoto) {
    listingFilterClauses.push("listingFilter.hasPhoto = 1");
  }

  if (typeof args.priceMin === "number" && Number.isFinite(args.priceMin)) {
    listingFilterClauses.push("listingFilter.price >= ?");
    listingFilterValues.push(args.priceMin);
  }

  if (typeof args.priceMax === "number" && Number.isFinite(args.priceMax)) {
    listingFilterClauses.push("listingFilter.price <= ?");
    listingFilterValues.push(args.priceMax);
  }

  addListingExistsFilter({
    clauses: listingFilterClauses,
    params,
    sql: whereSql,
    values: listingFilterValues,
  });

  params.push(...orderBy.params);
  params.push(getLimit(args.limit), getOffset(args.offset));

  try {
    const result = await client.execute({
      args: params,
      sql: `
        SELECT
          i.cultivarReferenceId,
          i.v2AhsCultivarId,
          i.normalizedName,
          i.displayName,
          i.hybridizer,
          i.yearInt,
          i.seedlingNumber,
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
          i.doublePercentage,
          i.polymerousPercentage,
          i.spiderRatio,
          i.petalLengthIn,
          i.petalWidthIn,
          i.awardNames,
          i.awardsJson,
          i.imageUrl,
          i.generatedImageAssetId,
          i.generatedImageUrl,
          i.generatedOriginalUrl,
          i.generatedThumbUrl,
          i.generatedBlurUrl,
          i.fallbackImageUrl,
          i.hasImage,
          i.listingCount,
          i.forSaleListingCount,
          i.sourceUpdatedAt
        FROM ${fromSql}
        ${whereSql.length > 0 ? `WHERE ${whereSql.join(" AND ")}` : ""}
        ORDER BY ${orderBy.sql}
        LIMIT ? OFFSET ?
      `,
    });
    const listingLimit = getListingLimit(args.listingLimit);
    const cultivarReferenceIds = result.rows
      .map((row) => toRequiredString(row.cultivarReferenceId))
      .filter(Boolean);
    const listingsByCultivar = new Map<
      string,
      Array<{
        catalogTitle: string | null;
        catalogUrl: string;
        forSale: boolean;
        hasPhoto: boolean;
        listingTitle: string;
        listingUrl: string;
        price: number | null;
      }>
    >();

    if (listingLimit > 0 && cultivarReferenceIds.length > 0) {
      const listingResult = await client.execute({
        args: [...cultivarReferenceIds, listingLimit],
        sql: `
          WITH ranked_listings AS (
            SELECT
              l.cultivarReferenceId,
              l.catalogSlugOrId,
              l.catalogTitle,
              l.listingTitle,
              l.price,
              l.forSale,
              l.hasPhoto,
              l.canonicalPath,
              ROW_NUMBER() OVER (
                PARTITION BY l.cultivarReferenceId
                ORDER BY l.forSale DESC, l.hasPhoto DESC, l.updatedAt DESC, l.listingTitle COLLATE NOCASE ASC
              ) AS ranking
            FROM CultivarListingSearchIndex l
            WHERE l.cultivarReferenceId IN (${cultivarReferenceIds.map(() => "?").join(", ")})
          )
          SELECT
            cultivarReferenceId,
            catalogSlugOrId,
            catalogTitle,
            listingTitle,
            price,
            forSale,
            hasPhoto,
            canonicalPath
          FROM ranked_listings
          WHERE ranking <= ?
          ORDER BY cultivarReferenceId, ranking
        `,
      });

      for (const row of listingResult.rows) {
        const cultivarReferenceId = toRequiredString(row.cultivarReferenceId);
        const catalogSlugOrId = toRequiredString(row.catalogSlugOrId);
        const canonicalPath = toRequiredString(row.canonicalPath);
        const listing = {
          catalogTitle: toStringOrNull(row.catalogTitle),
          catalogUrl: `${args.baseUrl}/${catalogSlugOrId}`,
          forSale: Boolean(row.forSale),
          hasPhoto: Boolean(row.hasPhoto),
          listingTitle: toRequiredString(row.listingTitle),
          listingUrl: `${args.baseUrl}${canonicalPath}`,
          price: typeof row.price === "number" ? row.price : null,
        };

        const listings = listingsByCultivar.get(cultivarReferenceId) ?? [];
        listings.push(listing);
        listingsByCultivar.set(cultivarReferenceId, listings);
      }
    }

    const parentageByCultivar =
      args.includeParentageTrees === false
        ? new Map<string, ParentageTree>()
        : await getParentageTrees({
            baseUrl: args.baseUrl,
            cultivarReferenceIds,
          });

    return result.rows.map((row) => {
      const normalizedName = toRequiredString(row.normalizedName);
      const cultivarReferenceId = toRequiredString(row.cultivarReferenceId);
      const segment = toCultivarRouteSegment(normalizedName);
      const generatedImageUrl = toStringOrNull(row.generatedImageUrl);
      const generatedImageAssetId = toStringOrNull(row.generatedImageAssetId);
      const fallbackImageUrl =
        toStringOrNull(row.fallbackImageUrl) ?? toStringOrNull(row.imageUrl);
      const usesGeneratedImage = Boolean(
        areGeneratedCultivarImageAssetsEnabledByDefault() &&
          generatedImageUrl &&
          generatedImageAssetId,
      );
      const imageUrl = usesGeneratedImage
        ? generatedImageUrl
        : fallbackImageUrl;
      const displayName = toRequiredString(row.displayName, normalizedName);
      const hybridizer = toStringOrNull(row.hybridizer);
      const color = toStringOrNull(row.color);
      const parentage = toStringOrNull(row.parentage);
      const awardNames = toStringOrNull(row.awardNames);

      return {
        canonicalUrl: segment ? `${args.baseUrl}/cultivar/${segment}` : null,
        catalogListings: listingsByCultivar.get(cultivarReferenceId) ?? [],
        cultivarReferenceId,
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
        imageUrl,
        matchedOn: getMatchReason({
          awardNames,
          color,
          displayName,
          hybridizer,
          parentage,
          q: args.q,
        }),
        parentageTree: parentageByCultivar.get(cultivarReferenceId) ?? null,
        listingSummary: {
          catalogsWithListings: Number(row.listingCount ?? 0),
          forSaleListings: Number(row.forSaleListingCount ?? 0),
        },
        name: displayName,
        normalizedName,
        source: {
          dataSource: "AHS V2 cultivar data",
          updatedAt: toRequiredString(row.sourceUpdatedAt),
        },
        traits: {
          awards: parseAwards(row.awardsJson),
          bloomHabit: toStringOrNull(row.bloomHabit),
          bloomSeason: toStringOrNull(row.bloomSeason),
          bloomSizeIn:
            typeof row.bloomSizeIn === "number" ? row.bloomSizeIn : null,
          branches: typeof row.branches === "number" ? row.branches : null,
          budCount: typeof row.budCount === "number" ? row.budCount : null,
          color,
          doublePercentage: toNumberOrNull(row.doublePercentage),
          foliageType: toStringOrNull(row.foliageType),
          form: toStringOrNull(row.form),
          flowerShow: toStringOrNull(row.flowerShow),
          fragrance: toStringOrNull(row.fragrance),
          hybridizer,
          parentage,
          petalLengthIn: toNumberOrNull(row.petalLengthIn),
          petalWidthIn: toNumberOrNull(row.petalWidthIn),
          ploidy: toStringOrNull(row.ploidy),
          polymerousPercentage: toNumberOrNull(row.polymerousPercentage),
          rebloom: row.rebloom === null ? null : Boolean(row.rebloom),
          scapeHeightIn:
            typeof row.scapeHeightIn === "number" ? row.scapeHeightIn : null,
          seedlingNumber: toStringOrNull(row.seedlingNumber),
          spiderRatio: toNumberOrNull(row.spiderRatio),
          sculptedTypes: toStringOrNull(row.sculptedTypes),
          year: typeof row.yearInt === "number" ? row.yearInt : null,
        },
        type: "cultivar" as const,
        v2AhsCultivarId: toStringOrNull(row.v2AhsCultivarId),
      };
    });
  } finally {
    client.close();
  }
}

export async function searchCultivarFacetValues(args: {
  facet: CultivarSearchFacet;
  limit?: number;
  query?: string;
}): Promise<CultivarSearchFacetOption[]> {
  const searchIndexStatus = await ensurePublicSearchIndex();
  if (!isPublicSearchIndexUsable(searchIndexStatus)) {
    throw new PublicSearchIndexUnavailableError(searchIndexStatus);
  }

  const client = createClient({
    url: `file:${getPublicSearchIndexPath()}`,
  });
  const query = args.query?.trim().toLowerCase() ?? "";
  const limit = Math.min(Math.max(Math.trunc(args.limit ?? 50), 1), 100);

  try {
    const result = await client.execute({
      args: [args.facet, query, query, `${query}%`, query, `${query}%`, limit],
      sql: `
        SELECT value, count
        FROM CultivarSearchFacetValue
        WHERE facet = ?
          AND (
            ? = ''
            OR (facet = 'hybridizer' AND instr(valueSearch, ?) > 0)
            OR (facet <> 'hybridizer' AND valueSearch LIKE ?)
          )
        ORDER BY
          CASE
            WHEN valueSearch = ? THEN 0
            WHEN valueSearch LIKE ? THEN 1
            ELSE 2
          END,
          count DESC,
          value COLLATE NOCASE ASC
        LIMIT ?
      `,
    });

    return result.rows.map((row) => {
      const value = toRequiredString(row.value);
      return {
        count: Number(row.count ?? 0),
        label: value,
        value,
      };
    });
  } finally {
    client.close();
  }
}
