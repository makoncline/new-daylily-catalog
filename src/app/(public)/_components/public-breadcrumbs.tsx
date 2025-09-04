"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs, type BreadcrumbItemType } from "@/components/breadcrumbs";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";

type PublicProfile = RouterOutputs["public"]["getProfile"];

interface PublicBreadcrumbsProps {
  profile?: {
    id?: string;
    title?: string | null;
    slug?: string | null;
  };
}

export function PublicBreadcrumbs({ profile }: PublicBreadcrumbsProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const [userSlugOrId, listingSlugOrId] = segments;

  // If we have server-rendered profile data, use it directly
  const profileData =
    profile ??
    api.public.getProfile.useQuery(
      { userSlugOrId: userSlugOrId! },
      { enabled: !!userSlugOrId && !profile },
    ).data;

  const { data: listing } = api.public.getListing.useQuery(
    { userSlugOrId: userSlugOrId!, listingSlugOrId: listingSlugOrId! },
    { enabled: !!userSlugOrId && !!listingSlugOrId },
  );

  // Generate breadcrumb items based on the current path
  const items: BreadcrumbItemType[] = [
    { title: "Catalogs", href: "/catalogs" },
  ];

  if (userSlugOrId && profileData) {
    // Use canonical ID path for consistency - use profile id if available, otherwise use userSlugOrId
    const canonical = `/${profileData.id ?? userSlugOrId}`;
    items.push({
      title: profileData.title ?? "Untitled Catalog",
      href: canonical,
    });
  }

  if (listingSlugOrId && listing) {
    items.push({
      title: listing.title ?? "Untitled Listing",
    });
  }

  return <Breadcrumbs items={items} />;
}
