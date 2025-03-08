"use client";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { DashboardBreadcrumbs } from "./_components/dashboard-breadcrumbs";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardClientWrapper } from "./_components/dashboard-client-wrapper";
import { useLocalStorage } from "@/hooks/use-local-storage";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen] = useLocalStorage<boolean>("sidebar:state", true);

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
          <div className="flex-1 space-y-4 p-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </DashboardClientWrapper>
  );
}
