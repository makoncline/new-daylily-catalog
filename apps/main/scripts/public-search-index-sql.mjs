export const CREATE_TARGET_SCHEMA_SQL = `
CREATE TABLE SearchIndexMeta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE CultivarSearchIndex (
  id INTEGER PRIMARY KEY,
  cultivarReferenceId TEXT NOT NULL UNIQUE,
  v2AhsCultivarId TEXT,
  normalizedName TEXT NOT NULL,
  displayName TEXT NOT NULL,
  displayNameSearch TEXT NOT NULL,
  hybridizer TEXT,
  hybridizerSearch TEXT,
  yearInt INTEGER,
  seedlingNumber TEXT,
  scapeHeightIn REAL,
  bloomSizeIn REAL,
  budCount INTEGER,
  branches INTEGER,
  bloomSeason TEXT,
  bloomHabit TEXT,
  form TEXT,
  flowerShow TEXT,
  flowerShowSearch TEXT,
  sculptedTypes TEXT,
  ploidy TEXT,
  foliageType TEXT,
  fragrance TEXT,
  color TEXT,
  parentage TEXT,
  rebloom INTEGER,
  doublePercentage REAL,
  polymerousPercentage REAL,
  spiderRatio REAL,
  petalLengthIn REAL,
  petalWidthIn REAL,
  awardNames TEXT,
  awardsJson TEXT,
  imageUrl TEXT,
  generatedImageAssetId TEXT,
  generatedImageUrl TEXT,
  generatedOriginalUrl TEXT,
  generatedThumbUrl TEXT,
  generatedBlurUrl TEXT,
  fallbackImageUrl TEXT,
  hasImage INTEGER NOT NULL,
  listingCount INTEGER NOT NULL,
  forSaleListingCount INTEGER NOT NULL,
  sourceUpdatedAt TEXT NOT NULL
);

CREATE TABLE CultivarSearchFacetValue (
  facet TEXT NOT NULL,
  value TEXT NOT NULL,
  valueSearch TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (facet, value)
);

CREATE TABLE CultivarSearchAward (
  cultivarId INTEGER NOT NULL,
  valueSearch TEXT NOT NULL,
  PRIMARY KEY (cultivarId, valueSearch)
);

CREATE TABLE CultivarSearchSculptedType (
  cultivarId INTEGER NOT NULL,
  value TEXT NOT NULL,
  valueSearch TEXT NOT NULL,
  PRIMARY KEY (cultivarId, valueSearch)
);

CREATE TABLE CultivarListingSearchIndex (
  id INTEGER PRIMARY KEY,
  listingId TEXT NOT NULL UNIQUE,
  cultivarReferenceId TEXT NOT NULL,
  catalogSlugOrId TEXT NOT NULL,
  catalogTitle TEXT,
  listingTitle TEXT NOT NULL,
  listingTitleSearch TEXT NOT NULL,
  listingDescription TEXT,
  listingDescriptionSearch TEXT,
  price REAL,
  forSale INTEGER NOT NULL,
  hasPhoto INTEGER NOT NULL,
  canonicalPath TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
`;

export const FACET_SQL = `
INSERT INTO CultivarSearchFacetValue (facet, value, valueSearch, count)
SELECT
  'hybridizer',
  hybridizer,
  lower(hybridizer),
  COUNT(*)
FROM CultivarSearchIndex
WHERE hybridizer IS NOT NULL
GROUP BY hybridizer;

INSERT INTO CultivarSearchFacetValue (facet, value, valueSearch, count)
SELECT
  'award',
  NULLIF(TRIM(json_extract(award.value, '$.name')), ''),
  lower(NULLIF(TRIM(json_extract(award.value, '$.name')), '')),
  COUNT(*)
FROM CultivarSearchIndex i
JOIN json_each(COALESCE(i.awardsJson, '[]')) award
WHERE NULLIF(TRIM(json_extract(award.value, '$.name')), '') IS NOT NULL
GROUP BY NULLIF(TRIM(json_extract(award.value, '$.name')), '');

INSERT INTO CultivarSearchAward (cultivarId, valueSearch)
SELECT
  i.id,
  lower(NULLIF(TRIM(json_extract(award.value, '$.name')), ''))
FROM CultivarSearchIndex i
JOIN json_each(COALESCE(i.awardsJson, '[]')) award
WHERE NULLIF(TRIM(json_extract(award.value, '$.name')), '') IS NOT NULL
GROUP BY
  i.id,
  lower(NULLIF(TRIM(json_extract(award.value, '$.name')), ''));

WITH RECURSIVE sculpted_type_parts(cultivarId, rest, value) AS (
  SELECT id, COALESCE(sculptedTypes, '') || '|', ''
  FROM CultivarSearchIndex
  WHERE sculptedTypes IS NOT NULL

  UNION ALL

  SELECT
    cultivarId,
    substr(rest, instr(rest, '|') + 1),
    trim(substr(rest, 1, instr(rest, '|') - 1))
  FROM sculpted_type_parts
  WHERE rest <> ''
)
INSERT INTO CultivarSearchSculptedType (cultivarId, value, valueSearch)
SELECT cultivarId, value, lower(value)
FROM sculpted_type_parts
WHERE value <> ''
GROUP BY cultivarId, lower(value);

INSERT INTO CultivarSearchFacetValue (facet, value, valueSearch, count)
SELECT 'flowerShow', flowerShow, flowerShowSearch, COUNT(*)
FROM CultivarSearchIndex
WHERE flowerShow IS NOT NULL
GROUP BY flowerShowSearch;

INSERT INTO CultivarSearchFacetValue (facet, value, valueSearch, count)
SELECT 'sculptedType', value, valueSearch, COUNT(*)
FROM CultivarSearchSculptedType
GROUP BY valueSearch;
`;

export const INDEX_SQL = `
CREATE VIRTUAL TABLE CultivarSearchFts USING fts5(
  displayName,
  normalizedName,
  hybridizer,
  color,
  parentage,
  awardNames,
  content='CultivarSearchIndex',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);

INSERT INTO CultivarSearchFts(
  rowid,
  displayName,
  normalizedName,
  hybridizer,
  color,
  parentage,
  awardNames
)
SELECT
  id,
  displayName,
  normalizedName,
  hybridizer,
  color,
  parentage,
  awardNames
FROM CultivarSearchIndex;

CREATE INDEX CultivarSearchIndex_yearInt_idx
  ON CultivarSearchIndex(yearInt);

CREATE INDEX CultivarSearchIndex_hybridizer_name_order_idx
  ON CultivarSearchIndex(
    hybridizerSearch,
    (substr(ltrim(displayName), 1, 1) GLOB '[0-9]') ASC,
    displayName COLLATE NOCASE ASC,
    id ASC
  );

CREATE INDEX CultivarSearchIndex_bloomSizeIn_idx
  ON CultivarSearchIndex(bloomSizeIn);

CREATE INDEX CultivarSearchIndex_scapeHeightIn_idx
  ON CultivarSearchIndex(scapeHeightIn);

CREATE INDEX CultivarSearchIndex_budCount_idx
  ON CultivarSearchIndex(budCount);

CREATE INDEX CultivarSearchIndex_branches_idx
  ON CultivarSearchIndex(branches);

CREATE INDEX CultivarSearchIndex_hasImage_idx
  ON CultivarSearchIndex(hasImage);

CREATE INDEX CultivarSearchIndex_normalizedName_idx
  ON CultivarSearchIndex(normalizedName);

CREATE INDEX CultivarSearchIndex_listingCount_idx
  ON CultivarSearchIndex(listingCount);

CREATE INDEX CultivarSearchIndex_forSaleListingCount_idx
  ON CultivarSearchIndex(forSaleListingCount);

CREATE INDEX CultivarSearchIndex_photo_listing_order_idx
  ON CultivarSearchIndex(
    (generatedImageUrl IS NOT NULL) DESC,
    hasImage DESC,
    listingCount DESC,
    forSaleListingCount DESC,
    displayName COLLATE NOCASE ASC,
    id ASC
  );

CREATE INDEX CultivarSearchIndex_photo_newest_order_idx
  ON CultivarSearchIndex(
    (generatedImageUrl IS NOT NULL) DESC,
    hasImage DESC,
    (yearInt IS NULL) ASC,
    yearInt DESC,
    displayName COLLATE NOCASE ASC,
    id ASC
  );

CREATE INDEX CultivarSearchIndex_photo_name_order_idx
  ON CultivarSearchIndex(
    (generatedImageUrl IS NOT NULL) DESC,
    hasImage DESC,
    (substr(ltrim(displayName), 1, 1) GLOB '[0-9]') ASC,
    displayName COLLATE NOCASE ASC,
    id ASC
  );

CREATE INDEX CultivarSearchIndex_name_order_idx
  ON CultivarSearchIndex(
    (substr(ltrim(displayName), 1, 1) GLOB '[0-9]') ASC,
    displayName COLLATE NOCASE ASC,
    id ASC
  );

CREATE INDEX CultivarSearchFacetValue_search_idx
  ON CultivarSearchFacetValue(facet, valueSearch, count DESC);

CREATE INDEX CultivarSearchAward_value_cultivar_idx
  ON CultivarSearchAward(valueSearch, cultivarId);

CREATE INDEX CultivarSearchSculptedType_value_cultivar_idx
  ON CultivarSearchSculptedType(valueSearch, cultivarId);

CREATE INDEX CultivarSearchIndex_flower_show_idx
  ON CultivarSearchIndex(flowerShowSearch, id);

CREATE INDEX CultivarSearchIndex_flower_show_listing_name_idx
  ON CultivarSearchIndex(
    flowerShowSearch,
    (substr(ltrim(displayName), 1, 1) GLOB '[0-9]') ASC,
    displayName COLLATE NOCASE ASC,
    id ASC
  )
  WHERE listingCount > 0;

CREATE INDEX CultivarListingSearchIndex_cultivarReferenceId_idx
  ON CultivarListingSearchIndex(cultivarReferenceId);

CREATE INDEX CultivarListingSearchIndex_catalogSlugOrId_idx
  ON CultivarListingSearchIndex(catalogSlugOrId);

CREATE INDEX CultivarListingSearchIndex_price_idx
  ON CultivarListingSearchIndex(price);

CREATE INDEX CultivarListingSearchIndex_forSale_idx
  ON CultivarListingSearchIndex(forSale);

CREATE INDEX CultivarListingSearchIndex_hasPhoto_idx
  ON CultivarListingSearchIndex(hasPhoto);
`;
