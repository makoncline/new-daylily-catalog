"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";
// import { atom, useAtomValue, useSetAtom } from "jotai";

// export const isUserProfileOpenAtom = atom(false);

function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname?.split("/").filter(Boolean);
  const currentPage = segments && segments.length > 1 ? segments[1] : null;
  const pageTitle = currentPage
    ? currentPage.charAt(0).toUpperCase() + currentPage.slice(1)
    : null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        {pageTitle && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
