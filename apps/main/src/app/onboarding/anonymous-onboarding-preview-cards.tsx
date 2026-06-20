"use client";

import Image from "next/image";
import { Link2, MapPin, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import {
  LISTING_FALLBACK_IMAGE,
  PROFILE_PLACEHOLDER_IMAGE,
} from "./anonymous-onboarding-config";

export function ProfilePreviewCard({
  title,
  description,
  imageUrl,
  location,
  ownershipBadge,
}: {
  title: string;
  description: string;
  imageUrl: string;
  location: string;
  ownershipBadge: string;
}) {
  const previewImageSrc = imageUrl.trim() || PROFILE_PLACEHOLDER_IMAGE;

  return (
    <div className="bg-card border-primary w-full max-w-sm overflow-hidden rounded-2xl border shadow-[0_0_0_2px_rgba(24,24,27,0.08)]">
      <div className="relative aspect-square border-b">
        <Image
          src={previewImageSrc}
          alt={title}
          fill
          sizes="(min-width: 1024px) 384px, 100vw"
          className="object-cover"
          unoptimized
        />
        <Badge className="absolute top-3 left-3" variant="secondary">
          {ownershipBadge}
        </Badge>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-3xl leading-tight font-bold tracking-tight">
          {title}
        </p>

        <Badge
          variant="secondary"
          className="inline-flex items-center gap-1 text-sm"
        >
          <MapPin className="size-3.5" />
          {location}
        </Badge>

        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

export function ListingPreviewCard({
  title,
  description,
  price,
  linkedLabel,
  hybridizerYear,
  imageUrl,
  ownershipBadge,
}: {
  title: string;
  description: string;
  price: number | null;
  linkedLabel: string;
  hybridizerYear: string;
  imageUrl: string;
  ownershipBadge: string;
}) {
  const showAddToCartButton = price !== null;
  const previewImageSrc = imageUrl.trim() || LISTING_FALLBACK_IMAGE;

  return (
    <div className="bg-card border-primary w-full max-w-sm overflow-hidden rounded-xl border shadow-[0_0_0_2px_rgba(24,24,27,0.08)]">
      <div className="bg-muted relative aspect-square border-b">
        <Image
          src={previewImageSrc}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 50vw, 280px"
          unoptimized
        />
        {price !== null ? (
          <Badge
            className="bg-background/90 absolute top-3 right-3 backdrop-blur-sm"
            variant="secondary"
          >
            {formatPrice(price)}
          </Badge>
        ) : null}
        <Badge
          className="bg-background/90 absolute right-3 bottom-3 backdrop-blur-sm"
          variant="secondary"
        >
          <Link2 className="size-3" />
        </Badge>
        <Badge className="absolute top-3 left-3" variant="secondary">
          {ownershipBadge}
        </Badge>
      </div>
      <div className="space-y-2 p-4">
        <p className="font-semibold tracking-tight">{title}</p>
        <Badge variant="secondary" className="text-xs">
          {hybridizerYear}
        </Badge>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
        <div className="flex items-center justify-between gap-2">
          <div className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <Link2 className="size-3.5" />
            {`Linked: ${linkedLabel}`}
          </div>
          {showAddToCartButton ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-xs"
            >
              <ShoppingCart className="mr-1 size-3.5" />
              Add to cart
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
