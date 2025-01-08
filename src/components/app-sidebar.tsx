"use client";

import * as React from "react";
import { Command, Flower2, ListTodo } from "lucide-react";
import { api } from "@/trpc/react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
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
      </SidebarContent>
      <SidebarFooter>
        {isLoading ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="cursor-default">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="grid flex-1 gap-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
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
