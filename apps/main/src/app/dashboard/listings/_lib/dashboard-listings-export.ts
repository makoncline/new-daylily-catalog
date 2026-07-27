import type { ListingData } from "@/app/dashboard/listings/_components/columns";
import { createSpreadsheetCsv } from "@/lib/catalog-importer";
import { formatAhsListingSummary } from "@/lib/utils";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";

const DAYLILY_CATALOG_BASE_URL = "https://daylilycatalog.com";

export const DASHBOARD_LISTINGS_EXPORT_HEADERS = [
  "Name",
  "Price",
  "Description",
  "Private Note",
  "Daylily Catalog ID",
  "Daylily Catalog Cultivar Name",
  "Daylily Catalog Cultivar URL",
  "Images",
  "Lists",
  "Status",
  "Daylily Database Description",
  "Hybridizer",
  "Year",
  "Scape Height",
  "Bloom Size",
  "Bloom Season",
  "Ploidy",
  "Foliage Type",
  "Bloom Habit",
  "Color",
  "Form",
  "Fragrance",
  "Bud Count",
  "Branches",
  "Created",
  "Updated",
] as const;

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function getCultivarUrl(normalizedName: string | null) {
  const segment = toCultivarRouteSegment(normalizedName);
  return segment ? `${DAYLILY_CATALOG_BASE_URL}/cultivar/${segment}` : "";
}

export function createDashboardListingsCsv(listings: ListingData[]) {
  const rows = listings.map((listing) => {
    const ahs = listing.ahsListing;

    return [
      listing.title,
      listing.price ?? "",
      listing.description ?? "",
      listing.privateNote ?? "",
      listing.cultivarReferenceId ?? "",
      ahs?.name ?? listing.cultivarReferenceNormalizedName ?? "",
      getCultivarUrl(
        listing.cultivarReferenceNormalizedName ?? ahs?.name ?? null,
      ),
      listing.images.length + (listing.cultivarReferenceImage ? 1 : 0),
      listing.lists.map((list) => list.title).join(", "),
      listing.status,
      formatAhsListingSummary(ahs) ?? "",
      ahs?.hybridizer ?? "",
      ahs?.year ?? "",
      ahs?.scapeHeight ?? "",
      ahs?.bloomSize ?? "",
      ahs?.bloomSeason ?? "",
      ahs?.ploidy ?? "",
      ahs?.foliageType ?? "",
      ahs?.bloomHabit ?? "",
      ahs?.color ?? "",
      ahs?.form ?? "",
      ahs?.fragrance ?? "",
      ahs?.budcount ?? "",
      ahs?.branches ?? "",
      formatDate(listing.createdAt),
      formatDate(listing.updatedAt),
    ];
  });

  return createSpreadsheetCsv([
    [...DASHBOARD_LISTINGS_EXPORT_HEADERS],
    ...rows,
  ]);
}
