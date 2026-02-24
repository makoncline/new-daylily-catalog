"use client";

import * as React from "react";
import {
  Command,
  Flower2,
  ListTodo,
  Send,
  Tag,
  UserCircle,
} from "lucide-react";
import { api } from "@/trpc/react";
import { NavMain } from "@/components/nav-main";
import { NavUser, NavUserSkeleton } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { useFeedbackUrl } from "@/hooks/use-feedback-url";
import { NavSecondary } from "./nav-secondary";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppSidebar({
  className,
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  // Function to close the sidebar on mobile
  const handleNavClick = React.useCallback(() => {
    setOpenMobile(false);
  }, [setOpenMobile]);

  const {
    data: user,
    isLoading,
    error,
  } = api.user.getCurrentUser.useQuery();

  const feedbackUrl = useFeedbackUrl();

  const navMainItems = React.useMemo(
    () => [
      {
        title: "Listings",
        url: "/dashboard/listings",
        icon: Flower2,
        isActive: pathname.startsWith("/dashboard/listings"),
      },
      {
        title: "Lists",
        url: "/dashboard/lists",
        icon: ListTodo,
        isActive: pathname.startsWith("/dashboard/lists"),
      },
      {
        title: "Profile",
        url: "/dashboard/profile",
        icon: UserCircle,
        isActive: pathname.startsWith("/dashboard/profile"),
      },
      {
        title: "Tags",
        url: "/dashboard/tags",
        icon: Tag,
        isActive: pathname.startsWith("/dashboard/tags"),
      },
    ],
    [pathname],
  );

  const navSecondaryItems = [
    {
      title: "Feedback",
      url: feedbackUrl,
      icon: Send,
    },
  ];

  return (
    <Sidebar
      variant="floating"
      collapsible="icon"
      className={className}
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip="Dashboard"
              onClick={handleNavClick}
            >
              <Link href="/dashboard" data-testid="dashboard-nav-home">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    Daylily Catalog
                  </span>
                  <span className="truncate text-xs">Your Garden</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} onNavClick={handleNavClick} />
        <NavSecondary
          items={navSecondaryItems}
          className="mt-auto"
          onNavClick={handleNavClick}
        />
      </SidebarContent>
      <SidebarFooter>
        {isLoading ? (
          <NavUserSkeleton />
        ) : error ? (
          // Show a minimal error state in the footer
          <div className="text-destructive px-4 py-2 text-xs">
            Failed to load user
          </div>
        ) : user ? (
          <NavUser
            user={{
              email: user.clerk?.email ?? "",
              avatar: user.clerk?.imageUrl ?? "",
            }}
          />
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
