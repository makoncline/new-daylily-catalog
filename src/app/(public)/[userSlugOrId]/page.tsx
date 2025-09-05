import { MainContent } from "@/app/(public)/_components/main-content";
import { PublicBreadcrumbs } from "@/app/(public)/_components/public-breadcrumbs";
import { getUserAndListingIdsAndSlugs } from "@/server/db/getUserAndListingIdsAndSlugs";
import { ProfileContent } from "./_components/profile-content";
import { unstable_cache } from "next/cache";
import { getPublicProfile } from "@/server/db/getPublicProfile";
import { getInitialListings } from "@/server/db/getPublicListings";
import { Suspense } from "react";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { notFound } from "next/navigation";
import { getErrorCode, tryCatch } from "@/lib/utils";
import { generateProfileMetadata } from "./_seo/metadata";
import { CatalogContent } from "./_components/catalog-content";
import { ProfilePageSEO } from "./_components/profile-seo";
import { FloatingCartButton } from "@/components/floating-cart-button";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const data = await getUserAndListingIdsAndSlugs();

  // Filter out null values and combine unique identifiers
  return data.flatMap((user) => {
    const identifiers = [user.id];
    if (user.profile?.slug) identifiers.push(user.profile.slug);

    return identifiers.map((slugOrId) => ({
      userSlugOrId: slugOrId,
    }));
  });
}

interface PageProps {
  params: Promise<{
    userSlugOrId: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { userSlugOrId } = await params;
  const url = getBaseUrl();

  const result = await tryCatch(getPublicProfile(userSlugOrId));

  if (!result.data) {
    return generateProfileMetadata(null, url);
  }

  return generateProfileMetadata(result.data, url);
}

export default async function Page({ params }: PageProps) {
  const { userSlugOrId } = await params;

  const getProfile = unstable_cache(
    async () => getPublicProfile(userSlugOrId),
    ["profile", userSlugOrId],
    { revalidate: 3600 },
  );

  const getListings = unstable_cache(
    async () => getInitialListings(userSlugOrId),
    ["listings", userSlugOrId, "initial"],
    { revalidate: 3600 },
  );

  // Use Promise.all with our tryCatch utility to fetch both in parallel
  const [profileResult, listingsResult] = await Promise.all([
    tryCatch(getProfile()),
    tryCatch(getListings()),
  ]);

  // Check for NOT_FOUND errors
  if (getErrorCode(profileResult.error) === "NOT_FOUND") {
    notFound();
  }

  // Rethrow other errors
  if (profileResult.error) {
    throw profileResult.error;
  }

  // Type safety - at this point we know we have data
  const initialProfile = profileResult.data;
  const initialListings = listingsResult.data ?? [];

  // Generate metadata
  const baseUrl = getBaseUrl();
  const metadata = await generateProfileMetadata(initialProfile, baseUrl);

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
            <CatalogContent
              lists={initialProfile.lists}
              initialListings={initialListings}
            />
          </Suspense>
        </div>

        {/* Add Floating Cart Button */}
        <FloatingCartButton
          userId={initialProfile.id}
          userName={initialProfile.title ?? undefined}
        />
      </MainContent>
    </>
  );
}
