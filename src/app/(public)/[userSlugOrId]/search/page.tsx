import { type Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { MainContent } from "@/app/(public)/_components/main-content";
import { CatalogSearchHeader } from "@/app/(public)/[userSlugOrId]/_components/catalog-search-header";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PublicCatalogSearchClient } from "@/components/public-catalog-search/public-catalog-search-client";
import {
  toPublicCatalogSearchParams,
  type PublicCatalogSearchParamRecord,
} from "@/lib/public-catalog-url-state";
import { getErrorCode, tryCatch } from "@/lib/utils";
import { getInitialListings } from "@/server/db/getPublicListings";
import { getPublicProfile } from "@/server/db/getPublicProfile";
import { getPublicProfileStaticParams } from "../_lib/public-profile-route";

export const revalidate = 86400;
export const dynamic = "force-static";
export const dynamicParams = true;

interface CatalogSearchPageProps {
  params: Promise<{
    userSlugOrId: string;
  }>;
  searchParams?: Promise<PublicCatalogSearchParamRecord>;
}

export async function generateStaticParams() {
  return getPublicProfileStaticParams();
}

export async function generateMetadata({
  params,
}: CatalogSearchPageProps): Promise<Metadata> {
  const { userSlugOrId } = await params;
  const profileResult = await tryCatch(getPublicProfile(userSlugOrId));

  if (!profileResult.data) {
    return {
      title: "Catalog Search Not Found",
      description: "The catalog search page you requested does not exist.",
      robots: "noindex, nofollow",
    };
  }

  const profile = profileResult.data;
  const canonicalUserSlug = profile.slug ?? profile.id;
  const titleBase = profile.title ?? "Daylily Catalog";

  return {
    title: `${titleBase} Catalog Search`,
    description: `Search and filter listings from ${titleBase}.`,
    robots: "noindex, nofollow",
    alternates: {
      canonical: `/${canonicalUserSlug}`,
    },
  };
}

export default async function CatalogSearchPage({
  params,
  searchParams,
}: CatalogSearchPageProps) {
  const { userSlugOrId } = await params;
  const rawSearchParams = await searchParams;
  const searchParamsAsUrl = toPublicCatalogSearchParams(rawSearchParams);

  const [profileResult, listingsResult] = await Promise.all([
    tryCatch(getPublicProfile(userSlugOrId)),
    tryCatch(getInitialListings(userSlugOrId)),
  ]);

  if (getErrorCode(profileResult.error) === "NOT_FOUND") {
    notFound();
  }

  if (profileResult.error) {
    throw profileResult.error;
  }

  const profile = profileResult.data;
  const initialListings = listingsResult.data ?? [];
  const canonicalUserSlug = profile.slug ?? profile.id;

  if (userSlugOrId !== canonicalUserSlug) {
    const queryString = searchParamsAsUrl.toString();
    permanentRedirect(
      queryString
        ? `/${canonicalUserSlug}/search?${queryString}`
        : `/${canonicalUserSlug}/search`,
    );
  }

  return (
    <MainContent>
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { title: "Catalogs", href: "/catalogs" },
            {
              title: profile.title ?? "Untitled Catalog",
              href: `/${canonicalUserSlug}`,
            },
            { title: "Catalog Search" },
          ]}
        />
      </div>

      <div className="space-y-6">
        <CatalogSearchHeader
          profile={{
            id: profile.id,
            title: profile.title ?? null,
          }}
        />

        <PublicCatalogSearchClient
          userId={profile.id}
          userSlugOrId={canonicalUserSlug}
          lists={profile.lists}
          initialListings={initialListings}
          totalListingsCount={profile._count.listings}
        />
      </div>
    </MainContent>
  );
}
