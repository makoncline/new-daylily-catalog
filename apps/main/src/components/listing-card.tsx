"use client";

import { type ComponentProps, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ListChecks, Link2 } from "lucide-react";
import { type RouterOutputs } from "@/trpc/react";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import { ImagePopover } from "@/components/image-popover";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { useDisplayAhsListing } from "@/hooks/use-display-ahs-listing";
import { CatalogListingCard } from "@/components/catalog-listing-card";
import Link from "next/link";

type ListingCardProps = {
  listing: RouterOutputs["public"]["getListings"][number];
  className?: string;
  priority?: boolean;
  children: ReactNode;
};

export function ListingCard({
  listing,
  className,
  priority = false,
  children,
}: ListingCardProps) {
  const displayAhsListing = useDisplayAhsListing(listing);
  const cultivarRouteSegment = toCultivarRouteSegment(
    listing.cultivarReference?.normalizedName,
  );
  const firstImage = listing.images[0];
  const hasMultipleImages = listing.images.length > 1;

  return (
    <CatalogListingCard.Root className={className}>
      {children}

      <CatalogListingCard.Media
        image={firstImage ?? null}
        alt={listing.title}
        priority={priority}
      >
        <CatalogListingCard.Price price={listing.price} />

        {/* Images Preview */}
        {hasMultipleImages && (
          <div className="absolute bottom-2 left-2 z-20">
            <ImagePopover
              images={listing.images}
              size="sm"
              className="hover:bg-secondary backdrop-blur-sm"
            />
          </div>
        )}

        {/* AHS Link Badge */}
        {displayAhsListing && (
          <div className="absolute right-2 bottom-2 z-20">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {cultivarRouteSegment ? (
                    <Link
                      href={`/cultivar/${cultivarRouteSegment}`}
                      prefetch={false}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Badge
                        variant="secondary"
                        className="hover:bg-secondary backdrop-blur-sm"
                      >
                        <Link2 className="size-3" />
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
                      <Link2 className="size-3" />
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
      </CatalogListingCard.Media>

      <CatalogListingCard.Content>
        <CatalogListingCard.Title title={listing.title} />
        {(displayAhsListing?.hybridizer ?? displayAhsListing?.year) ? (
          <CatalogListingCard.Meta
            text={`${displayAhsListing?.hybridizer ?? "Unknown"}, ${displayAhsListing?.year ?? "Year Unknown"}`}
          />
        ) : null}
        {listing.description ? (
          <CatalogListingCard.Description text={listing.description} />
        ) : null}
      </CatalogListingCard.Content>

      {listing.lists.length > 0 || listing.price !== null ? (
        <CatalogListingCard.Footer>
          {listing.lists.length > 0 ? (
            <div className="relative z-20 flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge
                      variant="secondary"
                      className="flex cursor-pointer items-center gap-1 text-xs"
                    >
                      <ListChecks className="size-3" />
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
          ) : (
            <span />
          )}

          {listing.price !== null ? (
            <div className="relative z-20">
              <AddToCartButton
                listing={{
                  id: listing.id,
                  title: listing.title,
                  price: listing.price,
                  userId: listing.userId,
                }}
              />
            </div>
          ) : null}
        </CatalogListingCard.Footer>
      ) : null}
    </CatalogListingCard.Root>
  );
}

interface ListingCardActionProps
  extends ComponentProps<typeof CatalogListingCard.Action> {
  asChild?: boolean;
}

export function ListingCardAction({
  asChild = false,
  className,
  type = "button",
  ...props
}: ListingCardActionProps) {
  return (
    <CatalogListingCard.Action
      asChild={asChild}
      type={type}
      className={className}
      {...props}
    />
  );
}
