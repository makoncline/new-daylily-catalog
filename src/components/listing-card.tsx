"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/truncated-text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ListChecks, Link2 } from "lucide-react";
import { type RouterOutputs } from "@/trpc/react";
import { formatPrice } from "@/lib/utils";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import { OptimizedImage } from "./optimized-image";
import { useViewListing } from "@/components/view-listing-dialog";
import { Skeleton } from "./ui/skeleton";
import { H3 } from "@/components/typography";
import { ImagePlaceholder } from "./image-placeholder";
import { ImagePopover } from "@/components/image-popover";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { useDisplayAhsListing } from "@/hooks/use-display-ahs-listing";
import Link from "next/link";

type ListingCardProps = {
  listing: RouterOutputs["public"]["getListings"][number];
  className?: string;
  priority?: boolean;
};

export function ListingCard({ listing, priority = false }: ListingCardProps) {
  const { viewListing } = useViewListing();
  const displayAhsListing = useDisplayAhsListing(listing);
  const cultivarRouteSegment = toCultivarRouteSegment(
    listing.cultivarReference?.normalizedName,
  );
  const firstImage = listing.images[0];
  const hasMultipleImages = listing.images.length > 1;

  return (
    <Card
      className="group hover:border-primary relative flex h-full cursor-pointer flex-col overflow-hidden transition-all"
      onClick={() => viewListing(listing)}
    >
      {/* Create SEO links for each URL variation */}
      {/* {urlVariations.map((url, index) => (
        <SEOLink
          key={`seo-link-${index}`}
          href={url}
          onCustomClick={() => viewListing(listing)}
          ariaLabel={`View details for ${listing.title}`}
          srText={`View ${listing.title}`}
        />
      ))} */}

      <div className="relative">
        <div className="aspect-square">
          {firstImage ? (
            <OptimizedImage
              src={firstImage.url}
              alt={listing.title}
              size="full"
              priority={priority}
              className="object-cover"
            />
          ) : (
            <ImagePlaceholder />
          )}
        </div>

        <div className="absolute top-2 right-2">
          {listing.price && (
            <Badge
              variant="secondary"
              className="hover:bg-secondary backdrop-blur-sm"
            >
              {formatPrice(listing.price)}
            </Badge>
          )}
        </div>

        {/* Images Preview */}
        {hasMultipleImages && (
          <div className="absolute bottom-2 left-2">
            <ImagePopover
              images={listing.images.map((img, i) => ({
                url: img.url,
                id: `listing-image-${i}`,
              }))}
              size="sm"
              className="hover:bg-secondary backdrop-blur-sm"
            />
          </div>
        )}

        {/* AHS Link Badge */}
        {displayAhsListing && (
          <div className="absolute right-2 bottom-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {cultivarRouteSegment ? (
                    <Link
                      href={`/cultivar/${cultivarRouteSegment}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Badge
                        variant="secondary"
                        className="hover:bg-secondary backdrop-blur-sm"
                      >
                        <Link2 className="h-3 w-3" />
                        <span className="sr-only">
                          View linked cultivar page
                        </span>
                      </Badge>
                    </Link>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="hover:bg-secondary backdrop-blur-sm"
                    >
                      <Link2 className="h-3 w-3" />
                    </Badge>
                  )}
                </TooltipTrigger>
                <TooltipContent side="top" align="end" className="p-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">
                      linked to
                    </span>
                    <span className="font-medium">
                      {displayAhsListing.name}
                    </span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex flex-1 flex-col justify-between gap-4">
          <div className="space-y-2">
            <H3>
              <TruncatedText text={listing.title} lines={1} />
            </H3>

            {/* Hybridizer and Year */}
            {(displayAhsListing?.hybridizer ?? displayAhsListing?.year) && (
              <Badge
                variant="secondary"
                className="inline-flex items-center gap-1"
              >
                <TruncatedText
                  text={`${displayAhsListing?.hybridizer ?? "Unknown"}, ${displayAhsListing?.year ?? "Year Unknown"}`}
                  lines={1}
                />
              </Badge>
            )}

            {/* Description */}
            {listing.description && (
              <TruncatedText
                text={listing.description}
                lines={3}
                className="text-muted-foreground text-sm"
              />
            )}
          </div>

          {/* Footer with Lists and Add to Cart Button */}
          <div className="flex items-center justify-between">
            {/* Lists */}
            {listing.lists.length > 0 && (
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge
                        variant="secondary"
                        className="flex cursor-pointer items-center gap-1 text-xs"
                      >
                        <ListChecks className="h-3 w-3" />
                        <span>
                          {listing.lists.length}{" "}
                          {listing.lists.length === 1 ? "list" : "lists"}
                        </span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" className="p-0">
                      <div className="flex max-w-[300px] flex-col gap-2 p-2">
                        {listing.lists.map((list) => (
                          <div
                            key={list.id}
                            className="flex items-center justify-between gap-4"
                          >
                            <span className="font-medium">{list.title}</span>
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            {/* Add to Cart Button - Only show if listing has a price */}
            {listing.price !== null && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                className="z-10"
              >
                <AddToCartButton
                  listing={{
                    id: listing.id,
                    title: listing.title,
                    price: listing.price,
                    userId: listing.userId,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ListingCardSkeleton() {
  return (
    <Card className="group flex h-full flex-col overflow-hidden">
      <div className="relative">
        <Skeleton className="aspect-square w-full" />
      </div>
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex flex-1 flex-col justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
