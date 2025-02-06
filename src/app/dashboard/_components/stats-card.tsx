"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, ListChecks, ImageIcon } from "lucide-react";
import Link from "next/link";
import type { RouterOutputs } from "@/trpc/react";
import { H2, H3, P, Muted } from "@/components/typography";
import { api } from "@/trpc/react";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { PRO_FEATURES } from "@/config/constants";

interface StatsCardProps {
  stats: RouterOutputs["dashboard"]["getStats"];
}

export function ListingDetailsCard({ stats }: StatsCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-muted-foreground" />
        <H3 className="text-sm font-medium">Listing Details</H3>
      </div>
      <div className="mt-2 space-y-1">
        <div className="flex justify-between text-sm">
          <Muted>Total listings</Muted>
          <div>
            <P>{stats.totalListings}</P>
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <Muted>Published listings</Muted>
          <div>
            <P>{stats.publishedListings}</P>
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <Muted>With link to daylily database</Muted>
          <div>
            <P>{stats.listingStats.withAhsData}</P>
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <Muted>With images</Muted>
          <div>
            <P>{stats.listingStats.withImages}</P>
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <Muted>With price</Muted>
          <div>
            <P>{stats.listingStats.withPrice}</P>
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <Muted>On lists</Muted>
          <div>
            <P>{stats.listingStats.inLists}</P>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function TotalListingsCard({ stats }: StatsCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-muted-foreground" />
        <H3 className="text-sm font-medium">Total Listings</H3>
      </div>
      <div className="mt-2 text-2xl font-bold">{stats.totalListings}</div>
      <Muted className="mt-2 text-xs">
        ${stats.listingStats.averagePrice.toFixed(2)} average price
      </Muted>
      {stats.totalListings === 0 && (
        <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
          <Link href="/dashboard/listings/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Listing
          </Link>
        </Button>
      )}
    </Card>
  );
}

export function TotalListsCard({ stats }: StatsCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-muted-foreground" />
        <H3 className="text-sm font-medium">Total Lists</H3>
      </div>
      <div className="mt-2 text-2xl font-bold">{stats.totalLists}</div>
      <Muted className="mt-2 text-xs">
        {stats.listStats.averageListingsPerList.toFixed(1)} listings per list
      </Muted>
      {stats.totalLists === 0 && (
        <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
          <Link href="/dashboard/lists/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Your First List
          </Link>
        </Button>
      )}
    </Card>
  );
}

export function ImagesCard({ stats }: StatsCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
        <H3 className="text-sm font-medium">Images</H3>
      </div>
      <div className="mt-2 text-2xl font-bold">{stats.imageStats.total}</div>
      <Muted className="mt-2 text-xs">
        {stats.listingStats.withImages} listings with images
      </Muted>
    </Card>
  );
}

export function ProMembershipCard() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: subscription, isLoading } =
    api.stripe.getSubscription.useQuery();
  const generateCheckout = api.stripe.generateCheckout.useMutation();

  // Don't show if loading or if user is already a pro member
  if (isLoading || hasActiveSubscription(subscription?.status)) {
    return null;
  }

  const handleUpgrade = async () => {
    try {
      const { url } = await generateCheckout.mutateAsync();
      router.push(url);
    } catch (error) {
      console.error("Failed to create checkout session", error);
      toast({
        title: "Failed to start checkout",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="mb-4 overflow-hidden">
      <div className="border-b border-border bg-card p-6">
        <div className="space-y-1">
          <H2 className="pb-2 text-3xl">Become a Daylily Catalog Pro</H2>
          <P className="text-base text-muted-foreground">
            Take your daylily business to the next level with advanced features
            and premium support.
          </P>
        </div>
      </div>
      <div className="bg-card/50 p-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex flex-1 flex-col gap-4">
            <H3 className="text-2xl">Why upgrade to Pro?</H3>
            <P className="text-sm leading-7 text-muted-foreground">
              Get access to premium features that help you grow your daylily
              business.
            </P>
            <ul className="space-y-2 text-sm">
              {PRO_FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <li key={feature.id} className="flex items-center">
                    <Icon className="mr-2 h-4 w-4" />
                    {feature.text}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex flex-1 flex-col justify-end gap-6">
            <Button
              size="lg"
              variant="gradient"
              onClick={handleUpgrade}
              disabled={generateCheckout.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              {generateCheckout.isPending ? "Loading..." : "Upgrade to Pro"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
