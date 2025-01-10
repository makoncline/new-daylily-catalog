"use client";

import { useState } from "react";
import { BadgeCheck, ChevronsUpDown, LogOut, Sparkles } from "lucide-react";
import { SignOutButton, useAuth, useClerk } from "@clerk/nextjs";
import { api } from "@/trpc/react";
import type Stripe from "stripe";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

type SubscriptionStatus = Stripe.Subscription.Status;

const getMembershipStatus = (status: SubscriptionStatus | undefined) => {
  if (!status) return false;

  switch (status) {
    case "active":
    case "trialing":
      return true;
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "past_due":
    case "paused":
    case "unpaid":
      return false;
    default:
      return false;
  }
};

export interface NavUserProps {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userId, isLoaded: isAuthLoaded } = useAuth();
  const { openUserProfile } = useClerk();
  const { data: userData, isLoading: isSubscriptionLoading } =
    api.stripe.getSubscription.useQuery(undefined, {
      enabled: !!userId,
      retry: false,
    });
  const createPortalSession = api.stripe.createPortalSession.useMutation();
  const getSubscriptionLink = api.stripe.getSubscriptionLink.useMutation();

  const hasActiveSubscription = getMembershipStatus(
    userData?.subscription?.status as SubscriptionStatus | undefined,
  );

  const handleUpgradeClick = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (hasActiveSubscription) {
        const result = await createPortalSession.mutateAsync();
        if (result.url) {
          window.location.href = result.url;
        }
      } else {
        const result = await getSubscriptionLink.mutateAsync();
        if (result.url) {
          window.location.href = result.url;
        }
      }
    } catch (error) {
      console.error("Failed to create session:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={handleUpgradeClick}
                disabled={isLoading || isSubscriptionLoading}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isLoading || isSubscriptionLoading
                  ? "Loading..."
                  : hasActiveSubscription
                    ? "Manage Subscription"
                    : "Upgrade to Pro"}
              </DropdownMenuItem>
              {error && (
                <DropdownMenuItem className="text-sm text-destructive" disabled>
                  {error}
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => openUserProfile()}>
                <BadgeCheck className="mr-2 h-4 w-4" />
                Account
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <SignOutButton>
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </SignOutButton>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export const NavUserSkeleton = () => {
  return (
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
  );
};
