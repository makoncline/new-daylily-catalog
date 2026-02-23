import { notFound, permanentRedirect } from "next/navigation";
import { MainContent } from "@/app/(public)/_components/main-content";
import { PublicBreadcrumbs } from "@/app/(public)/_components/public-breadcrumbs";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { getErrorCode, tryCatch } from "@/lib/utils";
import { CatalogSeoListings } from "./_components/catalog-seo-listings";
import { ProfileContent } from "./_components/profile-content";
import { ProfilePageSEO } from "./_components/profile-seo";
import { getPublicProfileStaticParams } from "./_lib/public-profile-route";
import { generatePaginatedProfileMetadata } from "./_seo/paginated-metadata";
import { generateProfileMetadata } from "./_seo/metadata";
import { getCachedPublicProfilePageData } from "@/server/cache/public-page-data-cache";

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
}

export async function generateMetadata({ params }: PageProps) {
  const { userSlugOrId } = await params;
  const page = 1;
  const baseUrl = getBaseUrl();

  const result = await tryCatch(
    getCachedPublicProfilePageData(userSlugOrId, page),
  );

  if (!result.data) {
    return generateProfileMetadata(null, baseUrl);
  }

  const baseMetadata = await generateProfileMetadata(
    result.data.profile,
    baseUrl,
  );
  const canonicalUserSlug = result.data.profile.slug ?? result.data.profile.id;

  return generatePaginatedProfileMetadata({
    baseMetadata,
    profileSlug: canonicalUserSlug,
    page,
    hasNonPageStateParams: false,
  });
}

export default async function Page({ params }: PageProps) {
  const { userSlugOrId } = await params;
  const requestedPage = 1;

  const pageDataResult = await tryCatch(
    getCachedPublicProfilePageData(userSlugOrId, requestedPage),
  );

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
  const forSaleCount = pageDataResult.data.forSaleCount;

  const canonicalUserSlug = initialProfile.slug ?? initialProfile.id;
  if (userSlugOrId !== canonicalUserSlug) {
    permanentRedirect(`/${canonicalUserSlug}`);
  }

  if (requestedPage !== activePage) {
    notFound();
  }

  const baseUrl = getBaseUrl();
  const baseMetadata = await generateProfileMetadata(initialProfile, baseUrl);
  const metadata = generatePaginatedProfileMetadata({
    baseMetadata,
    profileSlug: canonicalUserSlug,
    page: activePage,
    hasNonPageStateParams: false,
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
          <ProfileContent initialProfile={initialProfile} />

          <CatalogSeoListings
            canonicalUserSlug={canonicalUserSlug}
            listings={initialListings}
            profileLists={initialProfile.lists}
            page={activePage}
            totalPages={totalPages}
            totalCount={totalCount}
            forSaleCount={forSaleCount}
          />

        </div>
      </MainContent>
    </>
  );
}
