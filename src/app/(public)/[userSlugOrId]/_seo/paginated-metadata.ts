import { getPublicProfilePagePath } from "@/lib/public-catalog-url-state";
import { type Metadata } from "next";

interface GeneratePaginatedProfileMetadataArgs<T extends Metadata> {
  baseMetadata: T;
  profileSlug: string;
  page: number;
  hasNonPageStateParams: boolean;
  shouldIndex?: boolean;
}

export function generatePaginatedProfileMetadata<T extends Metadata>({
  baseMetadata,
  profileSlug,
  page,
  hasNonPageStateParams,
  shouldIndex = true,
}: GeneratePaginatedProfileMetadataArgs<T>): T {
  const canonicalPath = getPublicProfilePagePath(profileSlug, page);
  const baseTitle =
    typeof baseMetadata.title === "string"
      ? baseMetadata.title
      : "Daylily Catalog";

  let robots = "index, follow, max-image-preview:large";
  if (hasNonPageStateParams) {
    robots = "noindex, nofollow";
  } else if (!shouldIndex) {
    robots = "noindex, follow";
  }

  return {
    ...baseMetadata,
    title: page > 1 ? `${baseTitle} - Page ${page}` : baseTitle,
    robots,
    alternates: {
      ...(baseMetadata.alternates ?? {}),
      canonical: canonicalPath,
    },
  } as T;
}
