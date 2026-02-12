"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/optimized-image";
import { formatPrice, formatRelativeDate } from "@/lib/utils";
import { type RouterOutputs } from "@/trpc/react";

type CultivarPageOutput = NonNullable<
  RouterOutputs["public"]["getCultivarPage"]
>;
type OfferRow =
  CultivarPageOutput["offers"]["gardenCards"][number]["offers"][number];

export function getOfferViewingHref(sellerSlug: string, listingId: string) {
  const params = new URLSearchParams({ viewing: listingId });
  return `/${sellerSlug}?${params.toString()}`;
}

export function getOfferListHref(sellerSlug: string, listId: string) {
  const params = new URLSearchParams({ lists: listId });
  return `/${sellerSlug}?${params.toString()}#listings`;
}

interface CultivarOfferRowProps {
  sellerSlug: string;
  offer: OfferRow;
}

export function CultivarOfferRow({ sellerSlug, offer }: CultivarOfferRowProps) {
  const listingHref = getOfferViewingHref(sellerSlug, offer.id);

  return (
    <div
      className="flex items-start gap-4 rounded-lg border p-4"
      data-testid="cultivar-offer-row"
      data-listing-id={offer.id}
    >
      {offer.previewImageUrl ? (
        <Link
          href={listingHref}
          className="h-24 w-24 shrink-0 overflow-hidden rounded-md border"
        >
          <OptimizedImage
            src={offer.previewImageUrl}
            alt={`${offer.title} listing image`}
            className="h-24 w-24 object-cover"
            size="thumbnail"
          />
        </Link>
      ) : (
        <div className="bg-muted/20 h-24 w-24 shrink-0 rounded-md border" />
      )}

      <div className="min-w-0 flex-1 space-y-3">
        <div className="space-y-2">
          <Link
            href={listingHref}
            className="text-2xl leading-tight font-semibold hover:underline"
          >
            {offer.title}
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {offer.price !== null ? (
              <Badge variant="secondary" className="text-sm font-semibold">
                {formatPrice(offer.price)}
              </Badge>
            ) : (
              <Badge variant="outline">Not for sale</Badge>
            )}

            <Badge variant="outline" className="text-xs">
              {formatRelativeDate(new Date(offer.updatedAt))}
            </Badge>
          </div>
        </div>

        {offer.lists.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {offer.lists.map((list) => (
              <Link key={list.id} href={getOfferListHref(sellerSlug, list.id)}>
                <Badge variant="secondary" className="hover:bg-secondary/80">
                  {list.title}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0">
        <Button asChild variant="outline" size="sm">
          <Link href={listingHref}>
            View Details
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
