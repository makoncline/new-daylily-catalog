"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs, type BreadcrumbItemType } from "@/components/breadcrumbs";

interface PublicBreadcrumbsProps {
  profile: {
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

  // Generate breadcrumb items based on the current path
  const items: BreadcrumbItemType[] = [
    { title: "Catalogs", href: "/catalogs" },
  ];

  if (userSlugOrId) {
    const canonical = `/${profile.slug ?? profile.id ?? userSlugOrId}`;
    items.push({
      title: profile.title ?? "Untitled Catalog",
      href: canonical,
    });
  }

  if (listingSlugOrId && listingTitle !== undefined) {
    items.push({
      title: listingTitle ?? "Untitled Listing",
    });
  }

  return <Breadcrumbs items={items} />;
}
