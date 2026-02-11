"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CultivarCatalogListingRow } from "@/components/cultivar-catalog-listing-row";
import { ImagePopover } from "@/components/image-popover";
import {
  LastUpdatedBadge,
  ListCountBadge,
  ListingCountBadge,
  LocationBadge,
  MemberSince,
} from "@/components/profile/profile-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { H3, P } from "@/components/typography";
import type { CultivarPageCatalog } from "@/types";

interface CultivarCatalogCardProps {
  catalog: CultivarPageCatalog;
}

export function CultivarCatalogCard({ catalog }: CultivarCatalogCardProps) {
  const catalogHref = `/${catalog.slug}`;

  return (
    <Card data-testid="cultivar-catalog-card" data-catalog-slug={catalog.slug}>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-2">
              {catalog.profileImages.length > 0 && (
                <ImagePopover
                  images={catalog.profileImages}
                  size="sm"
                  className="border"
                />
              )}
              <H3 className="text-2xl">
                <Link href={catalogHref} className="hover:underline">
                  {catalog.title}
                </Link>
              </H3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {catalog.hasActiveSubscription && <Badge variant="secondary">Pro</Badge>}
              <LastUpdatedBadge date={new Date(catalog.updatedAt)} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {catalog.location && <LocationBadge location={catalog.location} />}
              <MemberSince date={new Date(catalog.createdAt)} />
            </div>

            {catalog.description && (
              <P className="line-clamp-2 text-muted-foreground">
                {catalog.description}
              </P>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <ListingCountBadge count={catalog.listingCount} />
              <ListCountBadge count={catalog.listCount} />
            </div>
          </div>

          <div className="shrink-0">
            <Button asChild size="sm" variant="outline">
              <Link href={catalogHref}>
                View Catalog
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {catalog.cultivarListings.map((listing) => (
            <CultivarCatalogListingRow
              key={listing.id}
              sellerSlug={catalog.slug}
              listing={listing}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
