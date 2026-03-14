import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { MainContent } from "@/app/(public)/_components/main-content";
import { PublicBreadcrumbs } from "@/app/(public)/_components/public-breadcrumbs";
import { parsePositiveInteger } from "@/lib/public-catalog-url-state";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { getErrorCode, tryCatch } from "@/lib/utils";
import { CatalogSeoListings } from "../../_components/catalog-seo-listings";
import { IsrWrittenAt } from "../../../_components/isr-written-at";
import { ProfileContent } from "../../_components/profile-content";
import { ProfilePageSEO } from "../../_components/profile-seo";
import {
  getPublicProfilePageData,
  getPublicProfilePaginatedStaticParams,
} from "../../_lib/public-profile-route";
import { generatePaginatedProfileMetadata } from "../../_seo/paginated-metadata";
import { generateProfileMetadata } from "../../_seo/metadata";

// CACHE_LITERAL_REF: CACHE_CONFIG.PUBLIC.STATIC_REVALIDATE_SECONDS
export const revalidate = 86400;
export const dynamic = "force-static";
export const dynamicParams = true;

interface ProfilePaginatedPageProps {
  params: Promise<{
    userSlugOrId: string;
    page: string;
  }>;
}

export async function generateStaticParams() {
  return getPublicProfilePaginatedStaticParams();
}

export async function generateMetadata({
  params,
}: ProfilePaginatedPageProps): Promise<Metadata> {
  const { userSlugOrId, page } = await params;
  const parsedPage = parsePositiveInteger(page, 1);

  if (parsedPage < 2) {
    return {
      robots: "noindex, nofollow",
    };
  }

  const baseUrl = getCanonicalBaseUrl();
  const profileResult = await tryCatch(
    getPublicProfilePageData(userSlugOrId, parsedPage),
  );

  if (!profileResult.data) {
    return {
      title: "Catalog Not Found",
      description: "The daylily catalog you are looking for does not exist.",
      robots: "noindex, nofollow",
    };
  }

  const baseMetadata = await generateProfileMetadata(
    profileResult.data.profile,
    baseUrl,
  );
  const canonicalUserSlug =
    profileResult.data.profile.slug ?? profileResult.data.profile.id;
  const shouldIndexCanonicalRoute =
    userSlugOrId === canonicalUserSlug &&
    profileResult.data.profile.hasActiveSubscription;

  return generatePaginatedProfileMetadata({
    baseMetadata,
    profileSlug: canonicalUserSlug,
    page: parsedPage,
    hasNonPageStateParams: false,
    shouldIndex: shouldIndexCanonicalRoute,
  });
}

export default async function ProfilePaginatedPage({
  params,
}: ProfilePaginatedPageProps) {
  const { userSlugOrId, page } = await params;
  const parsedPage = parsePositiveInteger(page, 1);

  if (parsedPage < 2) {
    notFound();
  }
  const pageDataResult = await tryCatch(
    getPublicProfilePageData(userSlugOrId, parsedPage),
  );

  if (getErrorCode(pageDataResult.error) === "NOT_FOUND") {
    notFound();
  }

  if (!pageDataResult.data) {
    throw pageDataResult.error;
  }

  if (pageDataResult.data.page !== parsedPage) {
    notFound();
  }

  const profile = pageDataResult.data.profile;
  const canonicalUserSlug = profile.slug ?? profile.id;
  const profileForPage = {
    ...profile,
    lists: [],
  };

  const baseUrl = getCanonicalBaseUrl();
  const baseMetadata = await generateProfileMetadata(profileForPage, baseUrl);
  const metadata = generatePaginatedProfileMetadata({
    baseMetadata,
    profileSlug: canonicalUserSlug,
    page: pageDataResult.data.page,
    hasNonPageStateParams: false,
    shouldIndex:
      userSlugOrId === canonicalUserSlug && profile.hasActiveSubscription,
  });

  return (
    <>
      <ProfilePageSEO
        profile={profileForPage}
        listings={pageDataResult.data.items}
        metadata={metadata}
        baseUrl={baseUrl}
      />

      <MainContent>
        <div className="mb-6">
          <PublicBreadcrumbs profile={profile} />
        </div>

        <div className="space-y-6">
          <ProfileContent initialProfile={profileForPage} />

          <CatalogSeoListings
            canonicalUserSlug={canonicalUserSlug}
            listings={pageDataResult.data.items}
            profileLists={[]}
            page={pageDataResult.data.page}
            totalPages={pageDataResult.data.totalPages}
            totalCount={pageDataResult.data.totalCount}
            forSaleCount={pageDataResult.data.forSaleCount}
            showListSummaries={false}
          />
        </div>

        <IsrWrittenAt
          routePath={`/${canonicalUserSlug}/page/${pageDataResult.data.page}`}
          routeType="profile_page_paginated"
        />
      </MainContent>
    </>
  );
}
