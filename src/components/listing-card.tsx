"use client";

import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OptimizedImage } from "@/components/optimized-image";
import { formatPrice } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/truncated-text";

interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    price: number | null;
    images: {
      id: string;
      url: string;
    }[];
    userId: string;
  };
}

export function ListingCard({ listing }: ListingCardProps) {
  const firstImage = listing.images[0];

  return (
    <Link href={`/catalogs/${listing.userId}/listings/${listing.id}`}>
      <Card className="group flex h-full flex-col overflow-hidden">
        <div className="relative">
          <div className="aspect-square">
            {firstImage ? (
              <OptimizedImage
                src={firstImage.url}
                alt={listing.title}
                size="full"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>
          {listing.price && (
            <Badge className="absolute right-2 top-2">
              {formatPrice(listing.price)}
            </Badge>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-between gap-2 p-4">
          <TruncatedText
            text={listing.title}
            maxLength={50}
            className="text-lg font-semibold"
          />
        </div>
      </Card>
    </Link>
  );
}

export function ListingCardSkeleton() {
  return (
    <Card className="group flex h-full flex-col overflow-hidden">
      <div className="relative">
        <Skeleton className="aspect-square w-full" />
      </div>
      <div className="flex flex-1 flex-col justify-between gap-2 p-4">
        <Skeleton className="h-6 w-3/4" />
      </div>
    </Card>
  );
}
