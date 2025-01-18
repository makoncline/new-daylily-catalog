"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { Breadcrumbs, type BreadcrumbItemType } from "@/components/breadcrumbs";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useLocalStorage } from "@/hooks/use-local-storage";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useLocalStorage("sidebar:state", true);

  // Generate breadcrumb items based on the current path
  const getBreadcrumbItems = () => {
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

    return items;
  };

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumbs items={getBreadcrumbItems()} />
          </div>
        </header>
        <main>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
