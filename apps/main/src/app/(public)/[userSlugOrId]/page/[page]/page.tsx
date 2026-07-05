import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { parsePositiveInteger } from "@/lib/public-catalog-url-state";
import {
  generatePublicProfilePageMetadata,
  renderPublicProfilePage,
} from "../../_lib/public-profile-page";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

interface ProfilePaginatedPageProps {
  params: Promise<{
    userSlugOrId: string;
    page: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProfilePaginatedPageProps): Promise<Metadata> {
  const { userSlugOrId, page } = await params;
  const parsedPage = parsePositiveInteger(page, 1);
  return generatePublicProfilePageMetadata({
    requirePaginatedPage: true,
    requestedPage: parsedPage,
    userSlugOrId,
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
  return renderPublicProfilePage({
    requestedPage: parsedPage,
    userSlugOrId,
  });
}
