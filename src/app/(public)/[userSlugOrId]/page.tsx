import { api } from "@/trpc/server";
import { MainContent } from "@/app/(public)/_components/main-content";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Flower2 } from "lucide-react";
import Link from "next/link";
import { CatalogDetailClient } from "./_components/catalog-detail-client";
import { PublicBreadcrumbs } from "@/app/(public)/_components/public-breadcrumbs";
import { type Metadata } from "next/types";
import { getUserAndListingIdsAndSlugs } from "@/server/db/getUserAndListingIdsAndSlugs";

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

  const profile = await api.public.getProfile({
    userSlugOrId,
  });

  if (!profile) {
    return {
      title: "Catalog Not Found",
      description: "The daylily catalog you are looking for does not exist.",
    };
  }

  const title = profile.title ?? "Daylily Catalog";
  const description =
    profile.description ??
    `Browse our collection of beautiful daylilies. ${profile.location ? `Located in ${profile.location}.` : ""}`.trim();
  const imageUrl = profile.images?.[0]?.url ?? "/images/default-catalog.jpg";

  return {
    title: `${title} | Daylily Catalog`,
    description,
    openGraph: {
      title: `${title} | Daylily Catalog`,
      description,
      images: [imageUrl],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Daylily Catalog`,
      description,
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
        ...(profile.location && {
          address: {
            "@type": "PostalAddress",
            addressLocality: profile.location,
          },
        }),
        url: `${process.env.NEXT_PUBLIC_APP_URL}/${profile.slug ?? profile.id}`,
      }),
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { userSlugOrId } = params;

  const profile = await api.public.getProfile({
    userSlugOrId,
  });

  if (!profile) {
    return (
      <MainContent>
        <EmptyState
          icon={<Flower2 className="h-12 w-12 text-muted-foreground" />}
          title="Catalog Not Found"
          description="The catalog you are looking for does not exist."
          action={
            <Button asChild>
              <Link href="/catalogs">Browse Catalogs</Link>
            </Button>
          }
        />
      </MainContent>
    );
  }

  return (
    <MainContent>
      <div className="mb-6">
        <PublicBreadcrumbs />
      </div>
      <CatalogDetailClient userSlugOrId={params.userSlugOrId} />
    </MainContent>
  );
}
