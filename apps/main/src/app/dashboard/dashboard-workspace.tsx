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
import { DashboardRefreshButton } from "./_components/dashboard-refresh-button";
import { DashboardBillingAlert } from "./_components/dashboard-billing-alert";
import { WebMcpProvider } from "@/components/webmcp-provider";
import { DashboardProviders } from "@/components/dashboard-providers";
import { DashboardEditorHost } from "./_components/dashboard-editor-host";
import { useState } from "react";

export default function DashboardWorkspace({
  children,
  held,
  holdWorkspace,
}: {
  children: React.ReactNode;
  held: boolean;
  holdWorkspace: (held: boolean) => void;
}) {
  return (
    <DashboardProviders>
      <DashboardClientWrapper>
        <DashboardShell held={held} holdWorkspace={holdWorkspace}>
          {children}
        </DashboardShell>
      </DashboardClientWrapper>
    </DashboardProviders>
  );
}

function DashboardShell({
  children,
  held,
  holdWorkspace,
}: {
  children: React.ReactNode;
  held: boolean;
  holdWorkspace: (held: boolean) => void;
}) {
  const [defaultOpen] = useState(() =>
    document.cookie.split("; ").includes("sidebar_state=true"),
  );
  return (
    <>
      <WebMcpProvider />
      <SidebarProvider
        defaultOpen={defaultOpen}
        onClickCapture={(event) => {
          if (
            held &&
            !(
              event.target instanceof Element &&
              event.target.closest("[data-history-recovery]")
            )
          ) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
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
          <div className="min-w-0 flex-1 space-y-4 p-8">
            <DashboardBillingAlert />
            <DashboardEditorHost holdWorkspace={holdWorkspace}>
              {children}
            </DashboardEditorHost>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
