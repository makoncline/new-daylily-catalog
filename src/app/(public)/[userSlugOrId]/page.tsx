import { MainContent } from "@/app/(public)/_components/main-content";
import { PublicBreadcrumbs } from "@/app/(public)/_components/public-breadcrumbs";
import { getUserAndListingIdsAndSlugs } from "@/server/db/getUserAndListingIdsAndSlugs";
import { ProfileContent } from "./_components/profile-content";
import { unstable_cache } from "next/cache";
import { getPublicProfile } from "@/server/db/getPublicProfile";
import { getInitialListings } from "@/server/db/getPublicListings";
import { Suspense } from "react";
import { METADATA_CONFIG } from "@/config/constants";
import { IMAGES } from "@/lib/constants/images";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { type Metadata } from "next";
import { CatalogContent } from "./_components/catalog-content";

// Client components need to be loaded dynamically since this is a server component
import dynamic from "next/dynamic";

// Dynamically import the FloatingCartButton with no SSR
const ClientCartButton = dynamic(
  () =>
    import("@/components/floating-cart-button").then(
      (mod) => mod.FloatingCartButton,
    ),
  { ssr: false },
);

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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { userSlugOrId } = await params;
  const url = getBaseUrl();

  const profile = await getPublicProfile(userSlugOrId);

  if (!profile) {
    return {
      title: "Catalog Not Found",
      description: "The daylily catalog you are looking for does not exist.",
      openGraph: {
        title: "Catalog Not Found",
        description: "The daylily catalog you are looking for does not exist.",
        siteName: METADATA_CONFIG.SITE_NAME,
        locale: METADATA_CONFIG.LOCALE,
      },
    };
  }

  const title = profile.title ?? "Daylily Catalog";
  const description =
    profile.description ??
    `Browse our collection of beautiful daylilies. ${profile.location ? `Located in ${profile.location}.` : ""}`.trim();

  const rawImageUrl = profile.images?.[0]?.url ?? IMAGES.DEFAULT_CATALOG;
  const imageUrl = getOptimizedMetaImageUrl(rawImageUrl);
  const pageUrl = `${url}/${profile.slug ?? profile.id}`;

  return {
    title: `${title} | ${METADATA_CONFIG.SITE_NAME}`,
    description,
    metadataBase: new URL(url),
    alternates: {
      canonical: `/${profile.id}`,
    },
    openGraph: {
      title: `${title} | ${METADATA_CONFIG.SITE_NAME}`,
      description,
      url: pageUrl,
      siteName: METADATA_CONFIG.SITE_NAME,
      locale: METADATA_CONFIG.LOCALE,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "Daylily catalog cover image",
        },
      ],
      type: "website",
    },
    twitter: {
      card: METADATA_CONFIG.TWITTER_CARD_TYPE,
      title: `${title} | ${METADATA_CONFIG.SITE_NAME}`,
      description,
      site: METADATA_CONFIG.TWITTER_HANDLE,
      images: [imageUrl],
    },
    other: {
      // Organization JSON-LD for rich results
      "script:ld+json": JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: title,
        description,
        image: imageUrl,
        url: pageUrl,
        ...(profile.location && {
          address: {
            "@type": "PostalAddress",
            addressLocality: profile.location,
          },
        }),
      }),
    },
  };
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

  const [initialProfile, initialListings] = await Promise.all([
    getProfile(),
    getListings(),
  ]);

  return (
    <MainContent>
      <div className="mb-6">
        <PublicBreadcrumbs />
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
      {initialProfile && (
        <ClientCartButton
          userId={initialProfile.id}
          userName={initialProfile.title ?? undefined}
        />
      )}
    </MainContent>
  );
}
