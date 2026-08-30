import "server-only";

import { getStorefrontSiteConfig } from "@/config/storefront-site-config";
import { formatCurrency, formatDate } from "@/lib/format";
import { getPublicEditorContentBlocks } from "@/lib/public-editor-content";
import { getOrderedStorefrontImages } from "@/lib/storefront-images";
import { getStorefrontSnapshot } from "@/server/storefront";
import type { StorefrontListing, StorefrontSnapshot } from "@/types/storefront";
import {
  findStorefrontListBySlug,
  findStorefrontListingBySlug,
  getStorefrontForSaleListings,
  getStorefrontListingsForList,
  getStorefrontSearchResult,
  sortStorefrontListings,
  type StorefrontBloomSize,
  type StorefrontListingFilters,
  type StorefrontPriceRange,
  type StorefrontScapeHeight,
} from "@/types/storefront-query";

const CATALOG_PAGE_SIZE = 24;

const cultivarTraitLabels = {
  hybridizer: "Hybridizer",
  year: "Year",
  seedlingNum: "Seedling number",
  parentage: "Parentage",
  ploidy: "Ploidy",
  scapeHeight: "Scape height",
  color: "Color",
  bloomHabit: "Bloom habit",
  bloomSeason: "Bloom season",
  rebloom: "Rebloom",
  bloomSize: "Bloom size",
  branches: "Branches",
  budcount: "Bud count",
  flower: "Flower",
  foliage: "Foliage",
  foliageType: "Foliage type",
  form: "Form",
  fragrance: "Fragrance",
  sculpting: "Sculpting",
} as const;

export interface StorefrontMarkdownRepresentation {
  body: string;
  status: 200 | 404;
}

function markdownText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/([`*_[\]<>#|])/g, "\\$1")
    .replace(/\s+/g, " ")
    .trim();
}

function markdownDestination(value: string) {
  return value.replace(/</g, "%3C").replace(/>/g, "%3E");
}

function markdownLink(label: string, destination: string) {
  return `[${markdownText(label)}](<${markdownDestination(destination)}>)`;
}

function finishMarkdown(lines: Array<string | null | undefined>) {
  return `${lines
    .filter((line): line is string => line !== null && line !== undefined)
    .join("\n")
    .trim()}\n`;
}

function listingPath(listing: StorefrontListing) {
  return `/${encodeURIComponent(listing.slug)}`;
}

function renderPublicStory(snapshot: StorefrontSnapshot) {
  const blocks = getPublicEditorContentBlocks(snapshot.seller.profile?.content);
  if (blocks.length === 0) return [];

  return [
    "## From the garden",
    "",
    ...blocks.flatMap((block) => {
      if (block.type === "paragraph") {
        return [markdownText(block.text), ""];
      }
      if (block.type === "header") {
        const level = Math.min(6, Math.max(3, block.level + 1));
        return [`${"#".repeat(level)} ${markdownText(block.text)}`, ""];
      }
      return [
        ...block.items.map(
          (item, index) =>
            `${block.style === "ordered" ? `${index + 1}.` : "-"} ${markdownText(item)}`,
        ),
        "",
      ];
    }),
  ];
}

function renderListingSummary(
  listing: StorefrontListing,
  snapshot: StorefrontSnapshot,
) {
  const listTitles = snapshot.lists
    .filter((list) => list.listingIds.includes(listing.id))
    .map((list) => list.title);

  return [
    `### ${markdownLink(listing.title, listingPath(listing))}`,
    `- Price: ${listing.price !== null && listing.price > 0 ? formatCurrency(listing.price) : "Display only"}`,
    listTitles.length
      ? `- Lists: ${listTitles.map(markdownText).join(", ")}`
      : "- Lists: None",
    `- Updated: ${formatDate(listing.updatedAt)}`,
    listing.description ? markdownText(listing.description) : null,
  ].filter((line): line is string => line !== null);
}

function renderHome(
  snapshot: StorefrontSnapshot,
): StorefrontMarkdownRepresentation {
  const site = getStorefrontSiteConfig();
  const profile = snapshot.seller.profile;
  const trimmedProfileTitle = profile?.title?.trim();
  const trimmedProfileDescription = profile?.description?.trim();
  const profileTitle =
    trimmedProfileTitle === undefined || trimmedProfileTitle === ""
      ? site.brand.name
      : trimmedProfileTitle;
  const profileDescription =
    trimmedProfileDescription === undefined || trimmedProfileDescription === ""
      ? site.brand.description
      : trimmedProfileDescription;

  return {
    status: 200,
    body: finishMarkdown([
      `# ${markdownText(profileTitle)}`,
      "",
      markdownText(profileDescription),
      "",
      ...renderPublicStory(snapshot),
      `- ${markdownLink("Daylilies for sale", "/catalog/for-sale")}`,
      `- ${markdownLink("All catalogs", "/catalogs")}`,
      `- ${markdownLink("Search the collection", "/catalog/search")}`,
      "",
      "## Store details",
      "",
      `- Public listings: ${snapshot.listings.length.toLocaleString("en-US")}`,
      profile?.location
        ? `- Location: ${markdownText(profile.location)}`
        : null,
      `- Minimum plant order: ${formatCurrency(site.commerce.minimumOrder)}`,
      `- Ordering: ${markdownText(
        site.commerce.orderingCopy ??
          "Contact the seller to confirm availability before payment.",
      )}`,
      `- Shipping: ${markdownText(
        site.commerce.shippingCopy ??
          `${formatCurrency(site.commerce.shipping.baseRate)} ships the first ${site.commerce.shipping.baseItems} plants. Each additional plant is ${formatCurrency(site.commerce.shipping.additionalItemRate)}.`,
      )}`,
      site.contact.email ? `- Email: ${site.contact.email}` : null,
      site.contact.phone ? `- Phone: ${site.contact.phone}` : null,
      "",
      `Data generated ${formatDate(snapshot.generatedAt)}.`,
    ]),
  };
}

function renderCatalogs(
  snapshot: StorefrontSnapshot,
): StorefrontMarkdownRepresentation {
  const lists = [...snapshot.lists].sort(
    (left, right) => right.listingIds.length - left.listingIds.length,
  );
  const forSaleCount = getStorefrontForSaleListings(snapshot).length;
  const lines = [
    "# Catalogs",
    "",
    "Browse a public list, plants for sale, or the complete collection.",
    "",
    `- ${markdownLink("Daylilies for sale", "/catalog/for-sale")} — ${forSaleCount.toLocaleString("en-US")} daylilies`,
    ...lists.map((list) => {
      const count = getStorefrontListingsForList(snapshot, list).length;
      return `- ${markdownLink(list.title, `/catalog/${list.slug}`)} — ${count.toLocaleString("en-US")} daylilies${list.description ? ` — ${markdownText(list.description)}` : ""}`;
    }),
    `- ${markdownLink("All daylilies", "/catalog/all")} — ${snapshot.listings.length.toLocaleString("en-US")} daylilies`,
    `- ${markdownLink("Search all daylilies", "/catalog/search")}`,
  ];

  return { status: 200, body: finishMarkdown(lines) };
}

function renderBlog(): StorefrontMarkdownRepresentation {
  const site = getStorefrontSiteConfig();

  return {
    status: 200,
    body: finishMarkdown([
      "# Blog",
      "",
      `Daylily stories, plant profiles, and notes from ${markdownText(site.brand.shortName)}.`,
      "",
      `## ${markdownLink("Dorothy and Toto", "/blog/dorothy-and-toto")}`,
      "",
      markdownText(
        "Dorothy and Toto is a fragrant, reblooming double daylily introduced by Herrington-K. Learn about its characteristics, parentage, and awards.",
      ),
    ]),
  };
}

function renderDorothyAndToto(): StorefrontMarkdownRepresentation {
  return {
    status: 200,
    body: finishMarkdown([
      "# Dorothy and Toto",
      "",
      markdownLink("Back to the blog", "/blog"),
      "",
      "## Introduction",
      "",
      "Dorothy and Toto is a stunning daylily that was introduced in 2003 by Herrington-K. It has won several awards, including the Stout Silver Medal in 2015, and is highly regarded by daylily enthusiasts.",
      "",
      "## Description",
      "",
      "Dorothy and Toto is a semi-evergreen daylily that blooms in mid-season and reblooms. It grows up to 30 inches tall and has 22 buds on 5 branches. The 6-inch double blooms are fragrant and a mix of rose, peach, and cream. The green throat of the flower provides an excellent contrast to the blooms' colors.",
      "",
      "## Background History",
      "",
      "Dorothy and Toto is a hybrid of Night Embers and (Victoria's Secret X sdlg). It has earned several awards from the American Hemerocallis Society, including the Stout Silver Medal in 2015, the Award of Merit in 2012, and the Honorable Mention in 2009.",
      "",
      "## Photos",
      "",
      "The original article included third-party photographs. They are not republished here.",
      "",
      "Original photo captions:",
      "",
      "- A beautiful photo of the Dorothy and Toto daylily.",
      "- A photo of the Dorothy and Toto daylily with other daylilies in the background.",
      "- A close-up of the beautiful blooms of the Dorothy and Toto daylily.",
      "",
      "## Conclusion",
      "",
      "The Dorothy and Toto daylily is a must-have for any daylily enthusiast. Its beautiful blooms, pleasant fragrance, and multiple awards make it an excellent addition to any garden. If you're looking for a daylily that is both beautiful and easy to care for, you can't go wrong with Dorothy and Toto.",
    ]),
  };
}

function getCatalogFilters(searchParams: URLSearchParams) {
  return {
    name: searchParams.get("name") ?? "",
    char: searchParams.get("char") ?? "",
    list: searchParams.get("list") ?? "",
    hybridizer: searchParams.get("hybridizer") ?? "",
    year: searchParams.get("year") ?? "",
    ploidy: searchParams.get("ploidy") ?? "",
    color: searchParams.get("color") ?? "",
    form: searchParams.get("form") ?? "",
    foliageType: searchParams.get("foliageType") ?? "",
    note: searchParams.get("note") ?? "",
    fragrance: searchParams.get("fragrance") ?? "",
    bloomSize: (searchParams.get("bloomSize") ?? "") as
      | StorefrontBloomSize
      | "",
    scapeHeight: (searchParams.get("scapeHeight") ?? "") as
      | StorefrontScapeHeight
      | "",
    bloomSeason: searchParams.get("bloomSeason") ?? "",
    rebloom: searchParams.get("rebloom") === "true",
    price: (searchParams.get("price") ?? "") as StorefrontPriceRange | "",
  } satisfies StorefrontListingFilters;
}

function getCatalogPageLink(url: URL, page: number) {
  const query = new URLSearchParams(url.searchParams);
  if (page <= 1) {
    query.delete("page");
  } else {
    query.set("page", String(page));
  }
  return `${url.pathname}${query.size ? `?${query.toString()}` : ""}`;
}

function renderCatalog(
  snapshot: StorefrontSnapshot,
  url: URL,
  options: {
    title: string;
    description: string;
    listings: StorefrontListing[];
  },
): StorefrontMarkdownRepresentation {
  const filters = getCatalogFilters(url.searchParams);
  const requestedPage = Number(url.searchParams.get("page") ?? "1");
  const result = getStorefrontSearchResult(
    options.listings,
    filters,
    snapshot.lists,
    requestedPage,
    CATALOG_PAGE_SIZE,
  );
  const activeFilters = Object.entries(filters).flatMap(([name, value]) =>
    value === "" || value === false
      ? []
      : [`- ${markdownText(name)}: ${markdownText(String(value))}`],
  );
  const lines = [
    `# ${markdownText(options.title)}`,
    "",
    markdownText(options.description),
    "",
    `${result.total.toLocaleString("en-US")} ${result.total === 1 ? "daylily" : "daylilies"}. Page ${result.page} of ${result.pageCount}.`,
    ...(activeFilters.length
      ? ["", "## Active filters", "", ...activeFilters]
      : []),
    "",
    "## Results",
    "",
    ...(result.listings.length
      ? result.listings.flatMap((listing) => [
          ...renderListingSummary(listing, snapshot),
          "",
        ])
      : ["No daylilies match these filters.", ""]),
    result.page > 1
      ? markdownLink("Previous page", getCatalogPageLink(url, result.page - 1))
      : null,
    result.page < result.pageCount
      ? markdownLink("Next page", getCatalogPageLink(url, result.page + 1))
      : null,
  ];

  return { status: 200, body: finishMarkdown(lines) };
}

function renderListing(
  snapshot: StorefrontSnapshot,
  listing: StorefrontListing,
): StorefrontMarkdownRepresentation {
  const lists = snapshot.lists.filter((list) =>
    list.listingIds.includes(listing.id),
  );
  const details = listing.cultivar?.details;
  const traitLines = details
    ? Object.entries(cultivarTraitLabels).flatMap(([key, label]) => {
        const value = details[key as keyof typeof cultivarTraitLabels];
        if (value === null || value === "") {
          return [];
        }
        return [
          `- ${label}: ${markdownText(
            typeof value === "boolean" ? (value ? "Yes" : "No") : value,
          )}`,
        ];
      })
    : [];
  const imageLines = getOrderedStorefrontImages(listing.images).map(
    (image, index) =>
      `- ${markdownLink(`${listing.title} image ${index + 1}`, image.url)}`,
  );

  return {
    status: 200,
    body: finishMarkdown([
      `# ${markdownText(listing.title)} Daylily`,
      "",
      `- Price: ${listing.price !== null && listing.price > 0 ? formatCurrency(listing.price) : "Display only"}`,
      `- Updated: ${formatDate(listing.updatedAt)}`,
      lists.length
        ? `- Catalogs: ${lists
            .map((list) => markdownLink(list.title, `/catalog/${list.slug}`))
            .join(", ")}`
        : "- Catalogs: None",
      "",
      listing.description ? markdownText(listing.description) : null,
      ...(traitLines.length
        ? ["", "## Cultivar details", "", ...traitLines]
        : []),
      ...(imageLines.length ? ["", "## Images", "", ...imageLines] : []),
    ]),
  };
}

function notFoundRepresentation(kind: "blog" | "catalog" | "daylily") {
  const title =
    kind === "blog"
      ? "Blog post not found"
      : kind === "catalog"
        ? "Catalog not found"
        : "Daylily not found";
  return {
    status: 404,
    body: finishMarkdown([
      `# ${title}`,
      "",
      kind === "blog"
        ? "The requested blog post does not exist."
        : kind === "catalog"
          ? "The requested public catalog does not exist."
          : "The requested public daylily listing does not exist.",
      "",
      kind === "blog"
        ? markdownLink("Browse the blog", "/blog")
        : markdownLink("Browse catalogs", "/catalogs"),
    ]),
  } satisfies StorefrontMarkdownRepresentation;
}

function normalizedPathname(pathname: string) {
  if (pathname === "/") {
    return pathname;
  }
  return pathname.replace(/\/+$/, "") || "/";
}

function decodePathSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export async function getStorefrontMarkdownRepresentation(
  url: URL,
): Promise<StorefrontMarkdownRepresentation | null> {
  const pathname = normalizedPathname(url.pathname);
  const segments = pathname.split("/").filter(Boolean);
  const isHome = pathname === "/";
  const isCatalogs = pathname === "/catalogs";
  const isCatalogRoute = segments[0] === "catalog";
  const isBlogRoute = segments[0] === "blog";
  const isListingRoute = segments.length === 1;

  if (
    !isHome &&
    !isCatalogs &&
    !isCatalogRoute &&
    !isBlogRoute &&
    !isListingRoute
  ) {
    return null;
  }
  if (["cart", "contact", "thanks"].includes(segments[0] ?? "")) {
    return null;
  }

  if (isBlogRoute) {
    if (segments.length === 1) {
      return renderBlog();
    }
    if (segments.length === 2 && segments[1] === "dorothy-and-toto") {
      return renderDorothyAndToto();
    }
    return notFoundRepresentation("blog");
  }

  const catalogSlug = isCatalogRoute
    ? segments.length === 2
      ? decodePathSegment(segments[1]!)
      : null
    : undefined;
  if (isCatalogRoute && !catalogSlug) {
    return notFoundRepresentation("catalog");
  }

  const listingSlug = isListingRoute
    ? decodePathSegment(segments[0]!)
    : undefined;
  if (isListingRoute && !listingSlug) {
    return notFoundRepresentation("daylily");
  }

  const site = getStorefrontSiteConfig();
  const snapshot = await getStorefrontSnapshot(site);

  if (isHome) {
    return renderHome(snapshot);
  }
  if (isCatalogs) {
    return renderCatalogs(snapshot);
  }
  if (isCatalogRoute) {
    const routeSlug = catalogSlug!;
    if (routeSlug === "all") {
      return renderCatalog(snapshot, url, {
        title: "All daylilies",
        description:
          "Browse every public listing, including display-only plants and plants that are not in a public list.",
        listings: sortStorefrontListings(snapshot.listings),
      });
    }
    if (routeSlug === "for-sale") {
      return renderCatalog(snapshot, url, {
        title: "Daylilies for sale",
        description: "Browse daylilies that are currently listed with a price.",
        listings: getStorefrontForSaleListings(snapshot),
      });
    }
    if (routeSlug === "search") {
      return renderCatalog(snapshot, url, {
        title: "Search the collection",
        description:
          "Use cultivar traits, public lists, price, and notes to find a daylily.",
        listings: sortStorefrontListings(snapshot.listings),
      });
    }

    const list = findStorefrontListBySlug(snapshot, routeSlug);
    if (!list) {
      return notFoundRepresentation("catalog");
    }
    return renderCatalog(snapshot, url, {
      title: list.title,
      description: list.description ?? `Browse ${list.title} daylilies.`,
      listings: getStorefrontListingsForList(snapshot, list),
    });
  }

  const listing = findStorefrontListingBySlug(snapshot, listingSlug!);
  return listing
    ? renderListing(snapshot, listing)
    : notFoundRepresentation("daylily");
}
