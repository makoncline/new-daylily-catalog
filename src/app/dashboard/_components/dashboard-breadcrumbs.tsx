"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs, type BreadcrumbItemType } from "@/components/breadcrumbs";
import { api } from "@/trpc/react";

export function DashboardBreadcrumbs() {
  const pathname = usePathname();

  // Generate breadcrumb items based on the current path
  const items: BreadcrumbItemType[] = [
    { title: "Dashboard", href: "/dashboard" },
  ];

  if (pathname === "/dashboard/listings") {
    items.push({ title: "Listings" });
  } else if (pathname === "/dashboard/lists") {
    items.push({ title: "Lists" });
  } else if (pathname === "/dashboard/profile") {
    items.push({ title: "Profile" });
  } else if (pathname.startsWith("/dashboard/lists/")) {
    const listId = pathname.split("/").pop();
    const { data: list } = api.list.get.useQuery(
      { id: listId! },
      { enabled: !!listId },
    );

    items.push(
      { title: "Lists", href: "/dashboard/lists" },
      { title: list?.name ?? "Loading..." },
    );
  }

  return <Breadcrumbs items={items} />;
}
