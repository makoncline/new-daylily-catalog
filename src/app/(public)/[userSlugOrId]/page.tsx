import { api } from "@/trpc/server";
import { MainContent } from "@/app/(public)/_components/main-content";
import { CatalogDetailClient } from "./_components/catalog-detail-client";
import { PublicBreadcrumbs } from "@/app/(public)/_components/public-breadcrumbs";
import { type Metadata } from "next/types";
import { getUserAndListingIdsAndSlugs } from "@/server/db/getUserAndListingIdsAndSlugs";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { IMAGES } from "@/lib/constants/images";
import { METADATA_CONFIG } from "@/config/constants";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";

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
  params: {
    userSlugOrId: string;
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { userSlugOrId } = params;
  const url = getBaseUrl();

  const profile = await api.public.getProfile({
    userSlugOrId,
  });

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
  const { userSlugOrId } = params;
  void api.public.getProfile.prefetch({ userSlugOrId });
  void api.public.getListings.prefetch({ userSlugOrId });

  return (
    <MainContent>
      <div className="mb-6">
        <PublicBreadcrumbs />
      </div>
      <CatalogDetailClient userSlugOrId={params.userSlugOrId} />
    </MainContent>
  );
}
