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
    url: "/listings",
    icon: Flower2,
    isActive: true,
  },
  {
    title: "Lists",
    url: "/lists",
    icon: ListTodo,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: user, isLoading } = api.user.getCurrentUser.useQuery();

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
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
          <div className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          </div>
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
