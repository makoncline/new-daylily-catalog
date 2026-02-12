"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/optimized-image";
import { formatPrice } from "@/lib/utils";
import { type RouterOutputs } from "@/trpc/react";

type CultivarPageOutput = NonNullable<RouterOutputs["public"]["getCultivarPage"]>;
type OfferRow = CultivarPageOutput["offers"]["gardenCards"][number]["offers"][number];

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
        <Link href={listingHref} className="h-24 w-24 shrink-0 overflow-hidden rounded-md border">
          <OptimizedImage
            src={offer.previewImageUrl}
            alt={`${offer.title} listing image`}
            className="h-24 w-24 object-cover"
            size="thumbnail"
          />
        </Link>
      ) : (
        <div className="h-24 w-24 shrink-0 rounded-md border bg-muted/20" />
      )}

      <div className="min-w-0 flex-1 space-y-3">
        <div className="space-y-2">
          <Link href={listingHref} className="text-2xl font-semibold leading-tight hover:underline">
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
              Updated {new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
                -Math.max(
                  0,
                  Math.floor((Date.now() - new Date(offer.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
                ),
                "day",
              )}
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
