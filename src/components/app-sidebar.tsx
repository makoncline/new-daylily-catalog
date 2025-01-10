"use client";

import * as React from "react";
import { Command, Flower2, ListTodo, LifeBuoy, Send } from "lucide-react";
import { api } from "@/trpc/react";
import { NavMain } from "@/components/nav-main";
import { NavUser, NavUserSkeleton } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeedbackUrl } from "@/hooks/use-feedback-url";
import { NavSecondary } from "./nav-secondary";

const navMainItems = [
  {
    title: "Listings",
    url: "/dashboard/listings",
    icon: Flower2,
    isActive: true,
  },
  {
    title: "Lists",
    url: "/dashboard/lists",
    icon: ListTodo,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: user, isLoading } = api.user.getCurrentUser.useQuery();
  const feedbackUrl = useFeedbackUrl();
  const navSecondaryItems = [
    {
      title: "Feedback",
      url: feedbackUrl,
      icon: Send,
    },
  ];
  return (
    <Sidebar variant="floating" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Dashboard">
              <a href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    Daylily Catalog
                  </span>
                  <span className="truncate text-xs">Your Garden</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        <NavSecondary items={navSecondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {isLoading ? (
          <NavUserSkeleton />
        ) : user ? (
          <NavUser
            user={{
              name: user.username ?? "User",
              email: user.email ?? "",
              avatar: user.imageUrl ?? "",
            }}
          />
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
