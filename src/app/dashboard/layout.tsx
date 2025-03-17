"use client";

import { Suspense } from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SIDEBAR_COOKIE_NAME,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { DashboardBreadcrumbs } from "./_components/dashboard-breadcrumbs";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardClientWrapper } from "./_components/dashboard-client-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

// Simple fallback loading state for the Suspense boundary
function DashboardFallback() {
  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

export const dynamic = "force-dynamic";

function getCookie(name: string) {
  if (typeof window === "undefined") {
    return;
  }
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarOpen = getCookie(SIDEBAR_COOKIE_NAME as string) === "true";

  return (
    <DashboardClientWrapper>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <DashboardBreadcrumbs />
            </div>
          </header>
          <Suspense fallback={<DashboardFallback />}>
            <div className="flex-1 space-y-4 p-8">{children}</div>
          </Suspense>
        </SidebarInset>
      </SidebarProvider>
    </DashboardClientWrapper>
  );
}
