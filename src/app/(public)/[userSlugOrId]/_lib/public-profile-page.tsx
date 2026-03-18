"use server";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MainContent } from "@/app/(public)/_components/main-content";
import { PublicBreadcrumbs } from "@/app/(public)/_components/public-breadcrumbs";
import { IsrWrittenAt } from "@/app/(public)/_components/isr-written-at";
import { CatalogSeoListings } from "@/app/(public)/[userSlugOrId]/_components/catalog-seo-listings";
import { ProfileContent } from "@/app/(public)/[userSlugOrId]/_components/profile-content";
import { ProfilePageSEO } from "@/app/(public)/[userSlugOrId]/_components/profile-seo";
import { generatePaginatedProfileMetadata } from "@/app/(public)/[userSlugOrId]/_seo/paginated-metadata";
import { generateProfileMetadata } from "@/app/(public)/[userSlugOrId]/_seo/metadata";
import { getErrorCode, tryCatch } from "@/lib/utils";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { getPublicProfilePageData } from "./public-profile-route";

interface GeneratePublicProfilePageMetadataArgs {
  requirePaginatedPage?: boolean;
  requestedPage: number;
  userSlugOrId: string;
}

interface RenderPublicProfilePageArgs {
  requestedPage: number;
  routeType: "profile_page" | "profile_page_paginated";
  userSlugOrId: string;
}

const CATALOG_NOT_FOUND_METADATA = {
  title: "Catalog Not Found",
  description: "The daylily catalog you are looking for does not exist.",
  robots: "noindex, nofollow",
} as const;

async function loadPublicProfilePageResult(
  userSlugOrId: string,
  requestedPage: number,
) {
  const pageDataResult = await tryCatch(
    getPublicProfilePageData(userSlugOrId, requestedPage),
  );

  if (getErrorCode(pageDataResult.error) === "NOT_FOUND") {
    notFound();
  }

  if (!pageDataResult.data) {
    throw pageDataResult.error ?? new Error("Failed to load public profile page");
  }

  if (pageDataResult.data.page !== requestedPage) {
    notFound();
  }

  return pageDataResult.data;
}

function toProfileForPage<TProfile extends { lists: unknown[] }>(
  profile: TProfile,
  requestedPage: number,
) {
  if (requestedPage === 1) {
    return profile;
  }

  return {
    ...profile,
    lists: [],
  };
}

export async function generatePublicProfilePageMetadata({
  requirePaginatedPage = false,
  requestedPage,
  userSlugOrId,
}: GeneratePublicProfilePageMetadataArgs): Promise<Metadata> {
  if (requirePaginatedPage && requestedPage < 2) {
    return {
      robots: "noindex, nofollow",
    };
  }

  const baseUrl = getCanonicalBaseUrl();
  const pageDataResult = await tryCatch(
    getPublicProfilePageData(userSlugOrId, requestedPage),
  );

  if (!pageDataResult.data) {
    return requestedPage === 1
      ? generateProfileMetadata(null, baseUrl)
      : CATALOG_NOT_FOUND_METADATA;
  }

  const baseMetadata = await generateProfileMetadata(
    pageDataResult.data.profile,
    baseUrl,
  );
  const canonicalUserSlug =
    pageDataResult.data.profile.slug ?? pageDataResult.data.profile.id;
  const shouldIndexCanonicalRoute =
    userSlugOrId === canonicalUserSlug &&
    pageDataResult.data.profile.hasActiveSubscription;

  return generatePaginatedProfileMetadata({
    baseMetadata,
    profileSlug: canonicalUserSlug,
    page: requestedPage,
    hasNonPageStateParams: false,
    shouldIndex: shouldIndexCanonicalRoute,
  });
}

export async function renderPublicProfilePage({
  requestedPage,
  routeType,
  userSlugOrId,
}: RenderPublicProfilePageArgs) {
  const pageData = await loadPublicProfilePageResult(userSlugOrId, requestedPage);
  const profile = pageData.profile;
  const profileForPage = toProfileForPage(profile, requestedPage);
  const canonicalUserSlug = profile.slug ?? profile.id;
  const baseUrl = getCanonicalBaseUrl();
  const baseMetadata = await generateProfileMetadata(profileForPage, baseUrl);
  const metadata = generatePaginatedProfileMetadata({
    baseMetadata,
    profileSlug: canonicalUserSlug,
    page: pageData.page,
    hasNonPageStateParams: false,
    shouldIndex:
      userSlugOrId === canonicalUserSlug && profile.hasActiveSubscription,
  });

  const routePath =
    requestedPage === 1
      ? `/${canonicalUserSlug}`
      : `/${canonicalUserSlug}/page/${pageData.page}`;

  return (
    <>
      <ProfilePageSEO
        profile={profileForPage}
        listings={pageData.items}
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
            listings={pageData.items}
            profileLists={profileForPage.lists}
            page={pageData.page}
            totalPages={pageData.totalPages}
            totalCount={pageData.totalCount}
            forSaleCount={pageData.forSaleCount}
            showListSummaries={requestedPage === 1}
          />
        </div>

        <IsrWrittenAt routePath={routePath} routeType={routeType} />
      </MainContent>
    </>
  );
}
