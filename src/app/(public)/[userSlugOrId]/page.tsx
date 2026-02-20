import { notFound, permanentRedirect } from "next/navigation";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { getErrorCode, tryCatch } from "@/lib/utils";
import { PublicProfilePageShell } from "./_components/public-profile-page-shell";
import { buildPublicProfilePageModel } from "./_lib/public-profile-model";
import {
  getPublicProfilePageData,
  getPublicProfileStaticParams,
} from "./_lib/public-profile-route";
import { generateProfileMetadata } from "./_seo/metadata";

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

  const result = await tryCatch(getPublicProfilePageData(userSlugOrId, page));

  if (!result.data) {
    return generateProfileMetadata(null, getBaseUrl());
  }

  const model = await buildPublicProfilePageModel(result.data);
  return model.seo.metadata;
}

export default async function Page({ params }: PageProps) {
  const { userSlugOrId } = await params;
  const requestedPage = 1;
  const pageDataResult = await tryCatch(
    getPublicProfilePageData(userSlugOrId, requestedPage),
  );

  if (getErrorCode(pageDataResult.error) === "NOT_FOUND") {
    notFound();
  }

  if (pageDataResult.error) {
    throw pageDataResult.error;
  }

  const pageData = pageDataResult.data;
  const model = await buildPublicProfilePageModel(pageData);
  const canonicalUserSlug = model.canonicalUserSlug;
  if (userSlugOrId !== canonicalUserSlug) {
    permanentRedirect(`/${canonicalUserSlug}`);
  }

  if (requestedPage !== pageData.page) {
    notFound();
  }

  return <PublicProfilePageShell model={model} />;
}
