import { MainContent } from "@/app/(public)/_components/main-content";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PUBLIC_CACHE_CONFIG } from "@/config/public-cache-config";
import { getErrorCode, tryCatch } from "@/lib/utils";
import { PublicCatalogSearchClient } from "@/components/public-catalog-search/public-catalog-search-client";
import { getInitialListings } from "@/server/db/getPublicListings";
import { getPublicProfile } from "@/server/db/getPublicProfile";
import { H1, Muted } from "@/components/typography";
import { type Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound, permanentRedirect } from "next/navigation";

export const revalidate = 86400;
export const dynamicParams = true;

interface CatalogSearchPageProps {
  params: Promise<{
    userSlugOrId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
  const queryParams = await searchParams;

  const getProfile = unstable_cache(
    async () => getPublicProfile(userSlugOrId),
    ["profile", userSlugOrId, "catalog-search"],
    { revalidate: PUBLIC_CACHE_CONFIG.REVALIDATE_SECONDS.PAGE.PROFILE },
  );

  const getListings = unstable_cache(
    async () => getInitialListings(userSlugOrId),
    ["listings", userSlugOrId, "catalog-search", "initial"],
    { revalidate: PUBLIC_CACHE_CONFIG.REVALIDATE_SECONDS.PAGE.PROFILE },
  );

  const [profileResult, listingsResult] = await Promise.all([
    tryCatch(getProfile()),
    tryCatch(getListings()),
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
    const query = new URLSearchParams();

    Object.entries(queryParams).forEach(([key, value]) => {
      if (typeof value === "string") {
        query.append(key, value);
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((entry) => query.append(key, entry));
      }
    });

    const queryString = query.toString();
    permanentRedirect(
      queryString
        ? `/${canonicalUserSlug}/catalog?${queryString}`
        : `/${canonicalUserSlug}/catalog`,
    );
  }

  return (
    <MainContent>
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { title: "Catalogs", href: "/catalogs" },
            { title: profile.title ?? "Untitled Catalog", href: `/${canonicalUserSlug}` },
            { title: "Catalog Search" },
          ]}
        />
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <H1 className="text-[clamp(24px,5vw,40px)]">
            {profile.title ?? "Catalog"} Search
          </H1>
          <Muted>Search, filter, and browse listings.</Muted>
        </div>

        <PublicCatalogSearchClient
          userSlugOrId={canonicalUserSlug}
          lists={profile.lists}
          initialListings={initialListings}
        />
      </div>
    </MainContent>
  );
}
