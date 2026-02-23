"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs, type BreadcrumbItemType } from "@/components/breadcrumbs";
import { withPublicClientQueryCache } from "@/lib/cache/client-cache";
import { api } from "@/trpc/react";
interface PublicBreadcrumbsProps {
  profile?: {
    id?: string;
    title?: string | null;
    slug?: string | null;
  };
  listingTitle?: string | null;
}

export function PublicBreadcrumbs({
  profile,
  listingTitle,
}: PublicBreadcrumbsProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const [userSlugOrId, listingSlugOrId] = segments;

  // If we have server-rendered profile data, use it directly
  const profileData =
    profile ??
    api.public.getProfile.useQuery(
      { userSlugOrId: userSlugOrId! },
      withPublicClientQueryCache({ enabled: !!userSlugOrId && !profile }),
    ).data;

  const hasListingTitleProp = listingTitle !== undefined;
  const shouldFetchListing =
    !!userSlugOrId && !!listingSlugOrId && !hasListingTitleProp;
  const { data: listing } = api.public.getListing.useQuery(
    { userSlugOrId: userSlugOrId!, listingSlugOrId: listingSlugOrId! },
    withPublicClientQueryCache({ enabled: shouldFetchListing }),
  );

  // Generate breadcrumb items based on the current path
  const items: BreadcrumbItemType[] = [
    { title: "Catalogs", href: "/catalogs" },
  ];

  if (userSlugOrId && profileData) {
    const canonical = `/${profileData.slug ?? profileData.id ?? userSlugOrId}`;
    items.push({
      title: profileData.title ?? "Untitled Catalog",
      href: canonical,
    });
  }

  const resolvedListingTitle = listingTitle ?? listing?.title ?? undefined;
  if (listingSlugOrId && (hasListingTitleProp || listing)) {
    items.push({
      title: resolvedListingTitle ?? "Untitled Listing",
    });
  }

  return <Breadcrumbs items={items} />;
}
