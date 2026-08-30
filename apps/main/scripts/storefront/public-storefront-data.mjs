import { Prisma } from "@prisma/client";
import { HTMLElement, NodeType, parse } from "node-html-parser";

const HIDDEN_STATUS = "HIDDEN";
const LISTING_BATCH_SIZE = 200;
const reservedPublicListSlugs = new Set(["all", "for-sale", "search"]);
const unsafePublicListSlugPattern = /[/?#%]/;

const imageAssetUrlSelect = {
  id: true,
  legacyImageId: true,
  order: true,
  displayUrl: true,
  thumbUrl: true,
  blurUrl: true,
};

function getPublicImageAssetInclude(kind) {
  return {
    where: { kind, status: "ready" },
    select: imageAssetUrlSelect,
    orderBy: [{ order: "asc" }, { id: "asc" }],
  };
}

const publicProfileImageAssetInclude = getPublicImageAssetInclude("profile");
const publicListingImageAssetInclude = getPublicImageAssetInclude("listing");

const publicCultivarImageAssetInclude = {
  where: {
    kind: "cultivar",
    status: "ready",
  },
  select: imageAssetUrlSelect,
  orderBy: [{ order: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  take: 1,
};

const publicStorefrontUserSelect = {
  id: true,
  profile: {
    select: {
      slug: true,
      title: true,
      description: true,
      content: true,
      location: true,
      updatedAt: true,
      images: {
        select: {
          id: true,
          url: true,
          order: true,
        },
        orderBy: [{ order: "asc" }, { id: "asc" }],
      },
      imageAssets: publicProfileImageAssetInclude,
    },
  },
};

const publicStorefrontListSelect = {
  id: true,
  title: true,
  description: true,
  updatedAt: true,
};

const v2AhsCultivarDisplaySelect = {
  id: true,
  post_title: true,
  introduction_date: true,
  seedling_number: true,
  primary_hybridizer_name: true,
  hybridizer_code_legacy: true,
  additional_hybridizers_names: true,
  bloom_season_names: true,
  fragrance_names: true,
  bloom_habit_names: true,
  foliage_names: true,
  ploidy_names: true,
  scape_height_in: true,
  bloom_size_in: true,
  bud_count: true,
  branches: true,
  color: true,
  flower_form_names: true,
  unusual_forms_names: true,
  sculpted_type_names: true,
  parentage: true,
  image_url: true,
  rebloom: true,
};

const legacyAhsDisplaySelect = {
  id: true,
  name: true,
  hybridizer: true,
  year: true,
  scapeHeight: true,
  bloomSize: true,
  bloomSeason: true,
  ploidy: true,
  foliageType: true,
  bloomHabit: true,
  seedlingNum: true,
  color: true,
  form: true,
  parentage: true,
  ahsImageUrl: true,
  fragrance: true,
  budcount: true,
  branches: true,
  sculpting: true,
  foliage: true,
  flower: true,
};

const publicStorefrontListingSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  price: true,
  updatedAt: true,
  images: {
    select: {
      id: true,
      url: true,
      order: true,
    },
    orderBy: [{ order: "asc" }, { id: "asc" }],
  },
  imageAssets: publicListingImageAssetInclude,
  cultivarReference: {
    select: {
      id: true,
      normalizedName: true,
      v2AhsCultivar: {
        select: v2AhsCultivarDisplaySelect,
      },
      ahsListing: {
        select: legacyAhsDisplaySelect,
      },
      imageAssets: publicCultivarImageAssetInclude,
    },
  },
};

const allowedInlineTags = new Set([
  "a",
  "b",
  "br",
  "code",
  "em",
  "i",
  "mark",
  "s",
  "strong",
  "u",
]);
const droppedTags = new Set([
  "audio",
  "canvas",
  "embed",
  "iframe",
  "img",
  "math",
  "object",
  "script",
  "source",
  "style",
  "svg",
  "template",
  "video",
]);
const canonicalPublicHost = "daylilycatalog.com";

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function normalizeSafeHref(href) {
  const trimmed = href.trim();
  if (trimmed.startsWith("/")) {
    return trimmed.startsWith("//")
      ? null
      : { href: trimmed, isInternal: true };
  }

  try {
    const parsedUrl = new URL(trimmed);
    if (!["http:", "https:", "mailto:", "tel:"].includes(parsedUrl.protocol)) {
      return null;
    }

    if (
      [canonicalPublicHost, `www.${canonicalPublicHost}`].includes(
        parsedUrl.hostname.toLowerCase(),
      )
    ) {
      return {
        href: `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`,
        isInternal: true,
      };
    }

    return { href: parsedUrl.toString(), isInternal: false };
  } catch {
    return null;
  }
}

function serializeSanitizedNode(node) {
  if (node.nodeType === NodeType.TEXT_NODE) {
    return escapeHtml(node.rawText);
  }

  if (!(node instanceof HTMLElement)) {
    return "";
  }

  const tagName = node.rawTagName.toLowerCase();
  if (droppedTags.has(tagName)) {
    return "";
  }

  const children = node.childNodes.map(serializeSanitizedNode).join("");
  if (!allowedInlineTags.has(tagName)) {
    return children;
  }

  if (tagName === "br") {
    return "<br>";
  }

  if (tagName === "a") {
    const href = node.getAttribute("href");
    const safeHref = href ? normalizeSafeHref(href) : null;
    if (!safeHref) {
      return `<a>${children}</a>`;
    }

    const externalAttributes = safeHref.isInternal
      ? ""
      : ' rel="noopener noreferrer nofollow" target="_blank"';
    return `<a href="${escapeAttribute(safeHref.href)}"${externalAttributes}>${children}</a>`;
  }

  return `<${tagName}>${children}</${tagName}>`;
}

function sanitizeEditorJsHtml(value) {
  const root = parse(`<root>${value}</root>`, {
    comment: false,
    lowerCaseTagName: true,
  });
  const wrapper = root.querySelector("root");

  return wrapper
    ? wrapper.childNodes.map(serializeSanitizedNode).join("")
    : escapeHtml(value);
}

function sanitizeRichTextData(value) {
  if (typeof value === "string") {
    return sanitizeEditorJsHtml(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeRichTextData);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        sanitizeRichTextData(nestedValue),
      ]),
    );
  }

  return value;
}

function isEditorJsData(value) {
  return Boolean(
    value && typeof value === "object" && Array.isArray(value.blocks),
  );
}

function getPublicProfileContent(content, updatedAt) {
  if (!content) {
    return null;
  }

  try {
    const parsedContent = JSON.parse(content);
    if (isEditorJsData(parsedContent)) {
      return {
        ...parsedContent,
        blocks: parsedContent.blocks.map((block) => ({
          ...block,
          data: sanitizeRichTextData(block.data),
        })),
      };
    }
  } catch {
    // Legacy plain text is converted below.
  }

  return {
    time: updatedAt.getTime(),
    blocks: [
      {
        id: "legacy",
        type: "paragraph",
        data: { text: sanitizeEditorJsHtml(content) },
      },
    ],
    version: "2.30.0",
  };
}

const directNamedHtmlEntities = {
  amp: "&",
  apos: "'",
  quot: '"',
  lt: "<",
  gt: ">",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  middot: "·",
  AElig: "Æ",
  Oslash: "Ø",
  aelig: "æ",
  oslash: "ø",
  yuml: "ÿ",
  szlig: "ß",
};
const combiningMarks = {
  acute: "\u0301",
  grave: "\u0300",
  circ: "\u0302",
  tilde: "\u0303",
  uml: "\u0308",
  ring: "\u030A",
  cedil: "\u0327",
};
const htmlEntityPattern = /&(#x[0-9a-fA-F]+|#\d+|[0-9A-Za-z]+);/g;

function toNonEmptyDisplayValue(value) {
  const trimmed = value?.trim() ?? null;
  return trimmed === "" ? null : trimmed;
}

function decodeNumericHtmlEntity(entity) {
  const isHex = entity.startsWith("#x") || entity.startsWith("#X");
  const rawCodePoint = isHex ? entity.slice(2) : entity.slice(1);
  const parsedCodePoint = Number.parseInt(rawCodePoint, isHex ? 16 : 10);

  if (!Number.isFinite(parsedCodePoint)) {
    return null;
  }

  try {
    return String.fromCodePoint(parsedCodePoint);
  } catch {
    return null;
  }
}

function decodeNamedHtmlEntity(entity) {
  const direct = directNamedHtmlEntities[entity];
  if (direct) {
    return direct;
  }

  const accentMatch =
    /^([A-Za-z])(acute|grave|circ|tilde|uml|ring|cedil)$/.exec(entity);
  if (!accentMatch) {
    return null;
  }

  const baseLetter = accentMatch[1];
  const combiningMark = combiningMarks[accentMatch[2]];
  return baseLetter && combiningMark
    ? `${baseLetter}${combiningMark}`.normalize("NFC")
    : null;
}

function decodeLegacyHybridizerValue(value) {
  const trimmed = toNonEmptyDisplayValue(value);
  if (!trimmed) {
    return null;
  }

  return toNonEmptyDisplayValue(
    trimmed.replace(htmlEntityPattern, (match, entity) => {
      return entity.startsWith("#")
        ? (decodeNumericHtmlEntity(entity) ?? match)
        : (decodeNamedHtmlEntity(entity) ?? match);
    }),
  );
}

function joinDisplayValues(values) {
  const uniqueValues = Array.from(
    new Set(values.map(toNonEmptyDisplayValue).filter(Boolean)),
  );
  return uniqueValues.length > 0 ? uniqueValues.join(", ") : null;
}

function formatNumericValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number.isInteger(value) ? String(value) : value.toString();
}

function formatInches(value) {
  const formatted = formatNumericValue(value);
  return formatted ? `${formatted}"` : null;
}

function formatInteger(value) {
  return value === null || value === undefined ? null : String(value);
}

function getYearFromIntroductionDate(value) {
  return value ? (/^\s*(\d{4})/.exec(value)?.[1] ?? null) : null;
}

function mapV2AhsCultivarToDisplayDetails(cultivar) {
  const unusualForm = toNonEmptyDisplayValue(cultivar.unusual_forms_names);
  const flowerForm = toNonEmptyDisplayValue(cultivar.flower_form_names);

  return {
    id: cultivar.id,
    name: cultivar.post_title ?? null,
    ahsImageUrl: toNonEmptyDisplayValue(cultivar.image_url),
    hybridizer:
      joinDisplayValues([
        cultivar.primary_hybridizer_name,
        cultivar.additional_hybridizers_names,
      ]) ??
      decodeLegacyHybridizerValue(cultivar.hybridizer_code_legacy) ??
      "unknown",
    year: getYearFromIntroductionDate(cultivar.introduction_date),
    seedlingNum: cultivar.seedling_number ?? null,
    scapeHeight: formatInches(cultivar.scape_height_in),
    bloomSize: formatInches(cultivar.bloom_size_in),
    bloomSeason: cultivar.bloom_season_names ?? null,
    ploidy: cultivar.ploidy_names ?? null,
    foliageType: cultivar.foliage_names ?? null,
    bloomHabit: cultivar.bloom_habit_names ?? null,
    color: cultivar.color ?? null,
    form: unusualForm ?? flowerForm,
    parentage: cultivar.parentage ?? null,
    fragrance: cultivar.fragrance_names ?? null,
    budcount: formatInteger(cultivar.bud_count),
    branches: formatInteger(cultivar.branches),
    sculpting: cultivar.sculpted_type_names ?? null,
    foliage: null,
    flower: unusualForm ? flowerForm : null,
    rebloom: cultivar.rebloom === null ? null : Boolean(cultivar.rebloom),
  };
}

function mapLegacyAhsListingToDisplayDetails(cultivar) {
  return {
    id: cultivar.id,
    name: toNonEmptyDisplayValue(cultivar.name),
    ahsImageUrl: toNonEmptyDisplayValue(cultivar.ahsImageUrl),
    hybridizer: toNonEmptyDisplayValue(cultivar.hybridizer),
    year: toNonEmptyDisplayValue(cultivar.year),
    seedlingNum: toNonEmptyDisplayValue(cultivar.seedlingNum),
    scapeHeight: toNonEmptyDisplayValue(cultivar.scapeHeight),
    bloomSize: toNonEmptyDisplayValue(cultivar.bloomSize),
    bloomSeason: toNonEmptyDisplayValue(cultivar.bloomSeason),
    ploidy: toNonEmptyDisplayValue(cultivar.ploidy),
    foliageType: toNonEmptyDisplayValue(cultivar.foliageType),
    bloomHabit: toNonEmptyDisplayValue(cultivar.bloomHabit),
    color: toNonEmptyDisplayValue(cultivar.color),
    form: toNonEmptyDisplayValue(cultivar.form),
    parentage: toNonEmptyDisplayValue(cultivar.parentage),
    fragrance: toNonEmptyDisplayValue(cultivar.fragrance),
    budcount: toNonEmptyDisplayValue(cultivar.budcount),
    branches: toNonEmptyDisplayValue(cultivar.branches),
    sculpting: toNonEmptyDisplayValue(cultivar.sculpting),
    foliage: toNonEmptyDisplayValue(cultivar.foliage),
    flower: toNonEmptyDisplayValue(cultivar.flower),
    rebloom: null,
  };
}

function isTrustedLegacyImageUrl(source) {
  try {
    return (
      new URL(source).hostname.toLowerCase() === "media.daylilycatalog.com"
    );
  } catch {
    return false;
  }
}

function toPublicAssetImage(asset, id = asset.id, order = asset.order) {
  if (!asset.displayUrl) {
    return null;
  }

  return {
    id,
    url: asset.displayUrl,
    thumbUrl: asset.thumbUrl ?? asset.displayUrl,
    blurUrl: asset.blurUrl ?? null,
    order,
  };
}

function resolveUploadedPublicImages(images, imageAssets) {
  const assetsByLegacyImageId = new Map(
    imageAssets
      .filter((asset) => asset.legacyImageId)
      .map((asset) => [asset.legacyImageId, asset]),
  );
  const legacyImages = images
    .map((image) => {
      const asset = assetsByLegacyImageId.get(image.id);
      const assetImage = asset
        ? toPublicAssetImage(asset, image.id, image.order)
        : null;
      if (assetImage) {
        return assetImage;
      }
      if (!isTrustedLegacyImageUrl(image.url)) {
        return null;
      }

      return {
        id: image.id,
        url: image.url,
        thumbUrl: null,
        blurUrl: null,
        order: image.order,
      };
    })
    .filter(Boolean);
  const directAssetImages = imageAssets
    .filter((asset) => !asset.legacyImageId)
    .map((asset) => toPublicAssetImage(asset))
    .filter(Boolean);

  return [...legacyImages, ...directAssetImages].sort(
    (left, right) =>
      left.order - right.order || left.id.localeCompare(right.id),
  );
}

function resolveCultivarFallbackImage(listingId, assets, fallbackUrl) {
  const generatedImage = assets[0] ? toPublicAssetImage(assets[0]) : null;
  if (generatedImage) {
    return { ...generatedImage, order: 0 };
  }
  if (!fallbackUrl) {
    return null;
  }

  return {
    id: `${listingId}:cultivar-fallback`,
    url: fallbackUrl,
    thumbUrl: null,
    blurUrl: null,
    order: 0,
  };
}

function toPublicListing(listing) {
  const cultivar = listing.cultivarReference;
  const details = cultivar?.v2AhsCultivar
    ? mapV2AhsCultivarToDisplayDetails(cultivar.v2AhsCultivar)
    : cultivar?.ahsListing
      ? mapLegacyAhsListingToDisplayDetails(cultivar.ahsListing)
      : null;
  const listingImages = resolveUploadedPublicImages(
    listing.images,
    listing.imageAssets,
  );
  const cultivarImage = resolveCultivarFallbackImage(
    listing.id,
    cultivar?.imageAssets ?? [],
    details?.ahsImageUrl ?? null,
  );
  const images =
    listingImages.length > 0 || !cultivarImage
      ? listingImages
      : [cultivarImage];

  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    images,
    cultivar: cultivar
      ? {
          id: cultivar.id,
          normalizedName: cultivar.normalizedName,
          details,
        }
      : null,
    updatedAt: listing.updatedAt.toISOString(),
  };
}

async function getPublicListings(database, sellerId, listingIds) {
  const listings = [];

  for (
    let offset = 0;
    offset < listingIds.length;
    offset += LISTING_BATCH_SIZE
  ) {
    const batchIds = listingIds.slice(offset, offset + LISTING_BATCH_SIZE);
    const batch = await database.listing.findMany({
      where: {
        id: { in: batchIds },
        userId: sellerId,
        OR: [{ status: null }, { NOT: { status: HIDDEN_STATUS } }],
      },
      select: publicStorefrontListingSelect,
    });
    const publicListingById = new Map(
      batch.map((listing) => [listing.id, toPublicListing(listing)]),
    );

    for (const listingId of batchIds) {
      const listing = publicListingById.get(listingId);
      if (listing) {
        listings.push(listing);
      }
    }
  }

  return listings;
}

async function getPublicListMemberships(database, sellerId) {
  return database.$queryRaw(Prisma.sql`
    SELECT
      relation."A" AS "listId",
      relation."B" AS "listingId"
    FROM "_ListToListing" AS relation
    INNER JOIN "List" AS list ON list."id" = relation."A"
    INNER JOIN "Listing" AS listing ON listing."id" = relation."B"
    WHERE list."userId" = ${sellerId}
      AND (list."status" IS NULL OR list."status" <> ${HIDDEN_STATUS})
      AND listing."userId" = ${sellerId}
      AND (listing."status" IS NULL OR listing."status" <> ${HIDDEN_STATUS})
    ORDER BY
      list."title" ASC,
      list."id" ASC,
      listing."title" ASC,
      listing."id" ASC
  `);
}

function getListingIdsByListId(memberships, publicListingIds) {
  const listingIdsByListId = new Map();

  for (const membership of memberships) {
    if (!publicListingIds.has(membership.listingId)) {
      continue;
    }

    const listingIds = listingIdsByListId.get(membership.listId) ?? [];
    listingIds.push(membership.listingId);
    listingIdsByListId.set(membership.listId, listingIds);
  }

  return listingIdsByListId;
}

function getPublicListSlug(title) {
  return title.toLowerCase().replace(/\s+/g, "-");
}

function getPublicListSlugs(lists, sellerId) {
  const listIdBySlug = new Map();
  const slugByListId = new Map();

  for (const list of lists) {
    const slug = getPublicListSlug(list.title);
    if (reservedPublicListSlugs.has(slug)) {
      throw new Error(
        `Reserved public list slug "${slug}" for seller "${sellerId}".`,
      );
    }
    if (
      slug.length === 0 ||
      slug === "." ||
      slug === ".." ||
      unsafePublicListSlugPattern.test(slug)
    ) {
      throw new Error(
        `Unsafe public list slug "${slug}" for seller "${sellerId}".`,
      );
    }
    const existingListId = listIdBySlug.get(slug);
    if (existingListId) {
      throw new Error(
        `Duplicate public list slug "${slug}" for seller "${sellerId}". Lists "${existingListId}" and "${list.id}" generate the same slug.`,
      );
    }

    listIdBySlug.set(slug, list.id);
    slugByListId.set(list.id, slug);
  }

  return slugByListId;
}

export async function getPublicStorefrontSnapshot(
  database,
  sellerId,
  generatedAt,
) {
  const user = await database.user.findUnique({
    where: { id: sellerId },
    select: publicStorefrontUserSelect,
  });
  if (!user) {
    return null;
  }

  const [lists, listingIdRows, memberships] = await Promise.all([
    database.list.findMany({
      where: {
        userId: sellerId,
        OR: [{ status: null }, { NOT: { status: HIDDEN_STATUS } }],
      },
      select: publicStorefrontListSelect,
      orderBy: [{ title: "asc" }, { id: "asc" }],
    }),
    database.listing.findMany({
      where: {
        userId: sellerId,
        OR: [{ status: null }, { NOT: { status: HIDDEN_STATUS } }],
      },
      select: { id: true },
      orderBy: [{ title: "asc" }, { id: "asc" }],
    }),
    getPublicListMemberships(database, sellerId),
  ]);
  const listSlugs = getPublicListSlugs(lists, sellerId);
  const listings = await getPublicListings(
    database,
    sellerId,
    listingIdRows.map((listing) => listing.id),
  );
  const listingIdsByListId = getListingIdsByListId(
    memberships,
    new Set(listings.map((listing) => listing.id)),
  );
  const profile = user.profile;

  return {
    version: 1,
    generatedAt,
    seller: {
      id: user.id,
      profile: profile
        ? {
            slug: profile.slug,
            title: profile.title,
            description: profile.description,
            content: getPublicProfileContent(
              profile.content,
              profile.updatedAt,
            ),
            location: profile.location,
            images: resolveUploadedPublicImages(
              profile.images,
              profile.imageAssets,
            ),
            updatedAt: profile.updatedAt.toISOString(),
          }
        : null,
    },
    lists: lists.map((list) => ({
      id: list.id,
      slug: listSlugs.get(list.id),
      title: list.title,
      description: list.description,
      listingIds: listingIdsByListId.get(list.id) ?? [],
      updatedAt: list.updatedAt.toISOString(),
    })),
    listings,
  };
}
