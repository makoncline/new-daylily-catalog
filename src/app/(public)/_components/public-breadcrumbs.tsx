"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs, type BreadcrumbItemType } from "@/components/breadcrumbs";
import { api } from "@/trpc/react";

export function PublicBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const [userSlugOrId, listingSlugOrId] = segments;

  const { data: profile } = api.public.getProfile.useQuery(
    { userSlugOrId: userSlugOrId! },
    { enabled: !!userSlugOrId },
  );

  const { data: listing } = api.public.getListing.useQuery(
    { userSlugOrId: userSlugOrId!, listingSlugOrId: listingSlugOrId! },
    { enabled: !!userSlugOrId && !!listingSlugOrId },
  );

  // Generate breadcrumb items based on the current path
  const items: BreadcrumbItemType[] = [
    { title: "Catalogs", href: "/catalogs" },
  ];

  if (userSlugOrId) {
    items.push({
      title: profile?.title ?? "Loading...",
      href: `/${userSlugOrId}`,
    });
  }

  if (listingSlugOrId && listing) {
    items.push({
      title: listing.title ?? "Untitled Listing",
    });
  }

  return <Breadcrumbs items={items} />;
}
