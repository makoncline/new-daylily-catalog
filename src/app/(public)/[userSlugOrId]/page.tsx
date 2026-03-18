import {
  generatePublicProfilePageMetadata,
  renderPublicProfilePage,
} from "./_lib/public-profile-page";
import {
  getPublicProfileStaticParams,
} from "./_lib/public-profile-route";

export const revalidate = false;
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
