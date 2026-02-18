import { getPublicProfilePagePath } from "@/lib/public-catalog-url-state";
import { type Metadata } from "next";

interface GeneratePaginatedProfileMetadataArgs<T extends Metadata> {
  baseMetadata: T;
  profileSlug: string;
  page: number;
  hasNonPageStateParams: boolean;
}

export function generatePaginatedProfileMetadata<T extends Metadata>({
  baseMetadata,
  profileSlug,
  page,
  hasNonPageStateParams,
}: GeneratePaginatedProfileMetadataArgs<T>): T {
  const canonicalPath = getPublicProfilePagePath(profileSlug, page);
  const baseTitle =
    typeof baseMetadata.title === "string" ? baseMetadata.title : "Daylily Catalog";

  return {
    ...baseMetadata,
    title: page > 1 ? `${baseTitle} - Page ${page}` : baseTitle,
    robots: hasNonPageStateParams
      ? "noindex, nofollow"
      : "index, follow, max-image-preview:large",
    alternates: {
      ...(baseMetadata.alternates ?? {}),
      canonical: canonicalPath,
    },
  } as T;
}
