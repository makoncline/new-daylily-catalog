import {
  generatePublicProfilePageMetadata,
  renderPublicProfilePage,
} from "./_lib/public-profile-page";

export const revalidate = 900;
export const dynamic = "force-static";
export const dynamicParams = true;

interface PageProps {
  params: Promise<{
    userSlugOrId: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { userSlugOrId } = await params;
  return generatePublicProfilePageMetadata({
    requestedPage: 1,
    userSlugOrId,
  });
}

export default async function Page({ params }: PageProps) {
  const { userSlugOrId } = await params;
  return renderPublicProfilePage({
    requestedPage: 1,
    routeType: "profile_page",
    userSlugOrId,
  });
}
