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

interface CultivarSearchArgs {
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
  form?: string;
  fragrance?: string;
  hasForSaleListings?: boolean;
  hasPhoto?: boolean;
  hasListings?: boolean;
  hybridizer?: string;
  limit?: number;
  listingLimit?: number;
  listingDescription?: string;
  listingTitle?: string;
  baseUrl: string;
  parentage?: string;
  ploidy?: string;
  priceMax?: number;
  priceMin?: number;
  q?: string;
  scapeHeightMax?: number;
  scapeHeightMin?: number;
  yearMax?: number;
  yearMin?: number;
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
  if (!rawLimit || !Number.isInteger(rawLimit)) {
    return DEFAULT_LISTING_LIMIT;
  }

  return Math.min(Math.max(rawLimit, 0), MAX_LISTING_LIMIT);
}

function toFtsQuery(value: string | undefined) {
  if (!value) {
    return null;
  }

  const tokens = value.match(SEARCH_TOKEN_REGEX);
  if (!tokens?.length) {
    return null;
  }

  return tokens.map((token) => `"${token.replaceAll('"', '""')}"`).join(" ");
}

function toContainsQuery(value: string) {
  return `%${value.trim().toLowerCase()}%`;
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

  args.sql.push(`${args.columnSql} LIKE ?`);
  args.params.push(toContainsQuery(args.value));
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

    const nodeMapsByCultivar = new Map<string, Map<string, ParentageTreeNode>>();

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
          matchedCultivarReferenceId && matchedNormalizedName && matchedDisplayName
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
  const ftsQuery = toFtsQuery(args.q);
  const fromSql = ftsQuery
    ? "CultivarSearchFts f JOIN CultivarSearchIndex i ON i.id = f.rowid"
    : "CultivarSearchIndex i";
  const orderSql = ftsQuery
    ? "bm25(CultivarSearchFts), i.listingCount DESC, i.displayName COLLATE NOCASE ASC"
    : "i.listingCount DESC, i.displayName COLLATE NOCASE ASC";

  if (ftsQuery) {
    whereSql.push("CultivarSearchFts MATCH ?");
    params.push(ftsQuery);
  }

  if (args.hybridizer?.trim()) {
    whereSql.push("i.hybridizerSearch LIKE ?");
    params.push(toContainsQuery(args.hybridizer));
  }

  addTextFilter({
    columnSql: "i.displayNameSearch",
    params,
    sql: whereSql,
    value: args.cultivarName,
  });
  addTextFilter({
    columnSql: "lower(i.bloomHabit)",
    params,
    sql: whereSql,
    value: args.bloomHabit,
  });
  addTextFilter({
    columnSql: "lower(i.bloomSeason)",
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
  addTextFilter({
    columnSql: "lower(i.foliageType)",
    params,
    sql: whereSql,
    value: args.foliageType,
  });
  addTextFilter({
    columnSql: "lower(i.form)",
    params,
    sql: whereSql,
    value: args.form,
  });
  addTextFilter({
    columnSql: "lower(i.fragrance)",
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
  addTextFilter({
    columnSql: "lower(i.ploidy)",
    params,
    sql: whereSql,
    value: args.ploidy,
  });

  if (args.hasListings) {
    whereSql.push("i.listingCount > 0");
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

  params.push(getLimit(args.limit));

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
          i.scapeHeightIn,
          i.bloomSizeIn,
          i.budCount,
          i.branches,
          i.bloomSeason,
          i.bloomHabit,
          i.form,
          i.ploidy,
          i.foliageType,
          i.fragrance,
          i.color,
          i.parentage,
          i.rebloom,
          i.imageUrl,
          i.generatedImageUrl,
          i.fallbackImageUrl,
          i.hasImage,
          i.listingCount,
          i.forSaleListingCount,
          i.sourceUpdatedAt
        FROM ${fromSql}
        ${whereSql.length > 0 ? `WHERE ${whereSql.join(" AND ")}` : ""}
        ORDER BY ${orderSql}
        LIMIT ?
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

    const parentageByCultivar = await getParentageTrees({
      baseUrl: args.baseUrl,
      cultivarReferenceIds,
    });

    return result.rows.map((row) => {
      const normalizedName = toRequiredString(row.normalizedName);
      const cultivarReferenceId = toRequiredString(row.cultivarReferenceId);
      const segment = toCultivarRouteSegment(normalizedName);
      const generatedImageUrl = toStringOrNull(row.generatedImageUrl);
      const fallbackImageUrl =
        toStringOrNull(row.fallbackImageUrl) ?? toStringOrNull(row.imageUrl);
      const imageUrl =
        areGeneratedCultivarImageAssetsEnabledByDefault() && generatedImageUrl
          ? generatedImageUrl
          : fallbackImageUrl;

      return {
        canonicalUrl: segment ? `${args.baseUrl}/cultivar/${segment}` : null,
        catalogListings: listingsByCultivar.get(cultivarReferenceId) ?? [],
        cultivarReferenceId,
        imageUrl,
        parentageTree: parentageByCultivar.get(cultivarReferenceId) ?? null,
        listingSummary: {
          catalogsWithListings: Number(row.listingCount ?? 0),
          forSaleListings: Number(row.forSaleListingCount ?? 0),
        },
        name: toRequiredString(row.displayName, normalizedName),
        normalizedName,
        source: {
          dataSource: "AHS V2 cultivar data",
          updatedAt: toRequiredString(row.sourceUpdatedAt),
        },
        traits: {
          bloomHabit: toStringOrNull(row.bloomHabit),
          bloomSeason: toStringOrNull(row.bloomSeason),
          bloomSizeIn:
            typeof row.bloomSizeIn === "number" ? row.bloomSizeIn : null,
          branches: typeof row.branches === "number" ? row.branches : null,
          budCount: typeof row.budCount === "number" ? row.budCount : null,
          color: toStringOrNull(row.color),
          foliageType: toStringOrNull(row.foliageType),
          form: toStringOrNull(row.form),
          fragrance: toStringOrNull(row.fragrance),
          hybridizer: toStringOrNull(row.hybridizer),
          parentage: toStringOrNull(row.parentage),
          ploidy: toStringOrNull(row.ploidy),
          rebloom: row.rebloom === null ? null : Boolean(row.rebloom),
          scapeHeightIn:
            typeof row.scapeHeightIn === "number" ? row.scapeHeightIn : null,
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
