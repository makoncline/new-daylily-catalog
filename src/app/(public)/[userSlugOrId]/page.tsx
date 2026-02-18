import { MainContent } from "@/app/(public)/_components/main-content";
import { PublicBreadcrumbs } from "@/app/(public)/_components/public-breadcrumbs";
import { ProfileContent } from "./_components/profile-content";
import { unstable_cache } from "next/cache";
import { Suspense } from "react";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { notFound, permanentRedirect } from "next/navigation";
import { getErrorCode, tryCatch } from "@/lib/utils";
import { generateProfileMetadata } from "./_seo/metadata";
import { ProfilePageSEO } from "./_components/profile-seo";
import { PUBLIC_CACHE_CONFIG } from "@/config/public-cache-config";
import {
  hasNonPageProfileParams,
  parsePositiveInteger,
  toPublicCatalogSearchParams,
  type PublicCatalogSearchParamRecord,
} from "@/lib/public-catalog-url-state";
import {
  getPublicProfilePageData,
  getPublicProfileStaticParams,
} from "./_lib/public-profile-route";
import { generatePaginatedProfileMetadata } from "./_seo/paginated-metadata";
import { CatalogSeoListings } from "./_components/catalog-seo-listings";

export const revalidate = 86400;
export const dynamic = "force-static";
export const dynamicParams = true;

export async function generateStaticParams() {
  return getPublicProfileStaticParams();
}

interface PageProps {
  params: Promise<{
    userSlugOrId: string;
  }>;
  searchParams?: Promise<PublicCatalogSearchParamRecord>;
}

export async function generateMetadata({ params, searchParams }: PageProps) {
  const { userSlugOrId } = await params;
  const resolvedSearchParams = await searchParams;
  const paramsAsUrlSearch = toPublicCatalogSearchParams(resolvedSearchParams);
  const page = parsePositiveInteger(paramsAsUrlSearch.get("page"), 1);
  const hasNonPageStateParams = hasNonPageProfileParams(paramsAsUrlSearch);
  const url = getBaseUrl();

  const result = await tryCatch(getPublicProfilePageData(userSlugOrId, page));

  if (!result.data) {
    return generateProfileMetadata(null, url);
  }

  const baseMetadata = await generateProfileMetadata(result.data.profile, url);
  const canonicalUserSlug = result.data.profile.slug ?? result.data.profile.id;

  return generatePaginatedProfileMetadata({
    baseMetadata,
    profileSlug: canonicalUserSlug,
    page,
    hasNonPageStateParams,
  });
}

export default async function Page({ params, searchParams }: PageProps) {
  const { userSlugOrId } = await params;
  const queryParams = await searchParams;
  const pageSearchParams = toPublicCatalogSearchParams(queryParams);
  const requestedPage = parsePositiveInteger(pageSearchParams.get("page"), 1);

  const getPageData = unstable_cache(
    async () => getPublicProfilePageData(userSlugOrId, requestedPage),
    ["profile-listings-page", userSlugOrId, String(requestedPage)],
    { revalidate: PUBLIC_CACHE_CONFIG.REVALIDATE_SECONDS.PAGE.PROFILE },
  );

  const pageDataResult = await tryCatch(getPageData());

  if (getErrorCode(pageDataResult.error) === "NOT_FOUND") {
    notFound();
  }

  if (pageDataResult.error) {
    throw pageDataResult.error;
  }

  const initialProfile = pageDataResult.data.profile;
  const initialListings = pageDataResult.data.items;
  const activePage = pageDataResult.data.page;
  const totalPages = pageDataResult.data.totalPages;
  const totalCount = pageDataResult.data.totalCount;

  const canonicalUserSlug = initialProfile.slug ?? initialProfile.id;
  if (userSlugOrId !== canonicalUserSlug) {
    const query = new URLSearchParams();

    Object.entries(queryParams ?? {}).forEach(([key, value]) => {
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
        ? `/${canonicalUserSlug}?${queryString}`
        : `/${canonicalUserSlug}`,
    );
  }

  if (requestedPage !== activePage) {
    notFound();
  }

  // Generate metadata
  const baseUrl = getBaseUrl();
  const baseMetadata = await generateProfileMetadata(initialProfile, baseUrl);
  const metadata = generatePaginatedProfileMetadata({
    baseMetadata,
    profileSlug: canonicalUserSlug,
    page: activePage,
    hasNonPageStateParams: hasNonPageProfileParams(pageSearchParams),
  });

  return (
    <>
      <ProfilePageSEO
        profile={initialProfile}
        listings={initialListings}
        metadata={metadata}
        baseUrl={baseUrl}
      />
      <MainContent>
        <div className="mb-6">
          <PublicBreadcrumbs profile={initialProfile} />
        </div>

        <div className="space-y-6">
          <Suspense>
            <ProfileContent initialProfile={initialProfile} />
          </Suspense>

          <Suspense>
            <CatalogSeoListings
              canonicalUserSlug={canonicalUserSlug}
              listings={initialListings}
              profileLists={initialProfile.lists}
              page={activePage}
              totalPages={totalPages}
              totalCount={totalCount}
              searchQueryString={pageSearchParams.toString()}
            />
          </Suspense>
        </div>
      </MainContent>
    </>
  );
}
