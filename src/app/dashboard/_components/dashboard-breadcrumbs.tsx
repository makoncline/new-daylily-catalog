"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { api } from "@/trpc/react";

export function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const listId = pathname.split("/").pop();
  const { data: list } = api.dashboardDb.list.get.useQuery(
    { id: listId! },
    { enabled: pathname.startsWith("/dashboard/lists/") && !!listId },
  );

  return (
    <Breadcrumbs
      items={[
        { title: "Home", href: "/" },
        { title: "Dashboard", href: "/dashboard" },
        ...(pathname === "/dashboard/listings"
          ? [{ title: "Listings" }]
          : pathname === "/dashboard/lists"
            ? [{ title: "Lists" }]
            : pathname === "/dashboard/profile"
              ? [{ title: "Profile" }]
              : pathname.startsWith("/dashboard/lists/")
                ? [
                    { title: "Lists", href: "/dashboard/lists" },
                    { title: list?.title ?? "Loading..." },
                  ]
                : []),
      ]}
    />
  );
}
