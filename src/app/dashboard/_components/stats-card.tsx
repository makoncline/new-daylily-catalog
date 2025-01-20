"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, ListChecks, ImageIcon } from "lucide-react";
import Link from "next/link";
import type { RouterOutputs } from "@/trpc/react";

interface StatsCardProps {
  stats: RouterOutputs["dashboard"]["getStats"];
}

export function ListingDetailsCard({ stats }: StatsCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Listing Details</h3>
      </div>
      <div className="mt-2 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total listings</span>
          <span>{stats.totalListings}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            With link to daylily database
          </span>
          <span>{stats.listingStats.withAhsData}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">With images</span>
          <span>{stats.listingStats.withImages}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">With price</span>
          <span>
            {stats.listingStats.averagePrice > 0 ? stats.totalListings : 0}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">On lists</span>
          <span>
            {Math.floor(
              stats.listStats.averageListingsPerList * stats.totalLists,
            )}
          </span>
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
        <h3 className="text-sm font-medium">Total Listings</h3>
      </div>
      <div className="mt-2 text-2xl font-bold">{stats.totalListings}</div>
      <div className="mt-2 text-xs text-muted-foreground">
        ${stats.listingStats.averagePrice.toFixed(2)} average price
      </div>
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
        <h3 className="text-sm font-medium">Total Lists</h3>
      </div>
      <div className="mt-2 text-2xl font-bold">{stats.totalLists}</div>
      <div className="mt-2 text-xs text-muted-foreground">
        {stats.listStats.averageListingsPerList.toFixed(1)} listings per list
      </div>
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
        <h3 className="text-sm font-medium">Images</h3>
      </div>
      <div className="mt-2 text-2xl font-bold">{stats.imageStats.total}</div>
      <div className="mt-2 text-xs text-muted-foreground">
        {stats.listingStats.withImages} listings with images
      </div>
    </Card>
  );
}
