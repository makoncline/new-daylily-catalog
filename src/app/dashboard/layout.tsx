import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { DashboardBreadcrumbs } from "./_components/dashboard-breadcrumbs";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardClientWrapper } from "./_components/dashboard-client-wrapper";
import { DashboardRefreshButton } from "./_components/dashboard-refresh-button";
import { cookies } from "next/headers";
import { type Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <DashboardClientWrapper>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex w-full items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <DashboardBreadcrumbs />
              </div>

              <div className="flex items-center gap-2">
                <DashboardRefreshButton />
              </div>
            </div>
          </header>
          <div className="flex-1 space-y-4 p-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </DashboardClientWrapper>
  );
}
