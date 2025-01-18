"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs, type BreadcrumbItemType } from "@/components/breadcrumbs";

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
  }

  return <Breadcrumbs items={items} />;
}
