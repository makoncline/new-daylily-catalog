import { type Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { parsePositiveInteger } from "@/lib/public-catalog-url-state";
import { getErrorCode, tryCatch } from "@/lib/utils";
import { PublicProfilePageShell } from "../../_components/public-profile-page-shell";
import { buildPublicProfilePageModel } from "../../_lib/public-profile-model";
import {
  getPublicProfilePageData,
  getPublicProfilePaginatedStaticParams,
} from "../../_lib/public-profile-route";

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

  const model = await buildPublicProfilePageModel(profileResult.data);
  return model.seo.metadata;
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

  const pageData = pageDataResult.data;
  const model = await buildPublicProfilePageModel(pageData);
  const canonicalUserSlug = model.canonicalUserSlug;

  if (userSlugOrId !== canonicalUserSlug) {
    permanentRedirect(`/${canonicalUserSlug}?page=${parsedPage}`);
  }

  return <PublicProfilePageShell model={model} />;
}
