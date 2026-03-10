"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/optimized-image";
import { TruncatedText } from "@/components/truncated-text";
import { cn, formatPrice, formatRelativeDate } from "@/lib/utils";
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
      className={cn(
        "flex flex-col gap-4 rounded-lg border p-4",
        offer.previewImageUrl && "md:h-56 md:flex-row",
      )}
      data-testid="cultivar-offer-row"
      data-listing-id={offer.id}
    >
      {offer.previewImageUrl && (
        <Link
          href={listingHref}
          className="aspect-square w-full shrink-0 overflow-hidden rounded-md border md:h-full md:w-auto"
        >
          <OptimizedImage
            src={offer.previewImageUrl}
            alt={`${offer.title} listing image`}
            className="h-full w-full object-cover"
            size="full"
          />
        </Link>
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
              <Badge
                variant="secondary"
                className="text-sm font-semibold whitespace-nowrap"
              >
                {formatPrice(offer.price)}
              </Badge>
            ) : (
              <Badge variant="outline" className="whitespace-nowrap">
                Not for sale
              </Badge>
            )}

            <Badge variant="outline" className="text-xs whitespace-nowrap">
              {formatRelativeDate(new Date(offer.updatedAt))}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {offer.lists.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {offer.lists.map((list) => (
                <Link
                  key={list.id}
                  href={getOfferListHref(sellerSlug, list.id)}
                >
                  <Badge
                    variant="secondary"
                    className="hover:bg-secondary/80 max-w-[220px]"
                  >
                    <TruncatedText text={list.title} lines={1} />
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <div />
          )}

          <div className="shrink-0">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full md:w-auto"
            >
              <Link href={listingHref}>
                View Details
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
