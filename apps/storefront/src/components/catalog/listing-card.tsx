"use client";

import { Badge } from "@daylily-catalog/ui/components/badge";
import { Button } from "@daylily-catalog/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@daylily-catalog/ui/components/card";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { StorefrontBlurBackdrop } from "@/components/catalog/storefront-image";
import { formatCurrency } from "@/lib/format";

const catalogCardImageSizes =
  "(min-width: 1280px) 384px, (min-width: 1024px) 30vw, (min-width: 640px) 46vw, calc(100vw - 2rem)";

export interface CatalogListingCardData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number | null;
  imageUrl: string | null;
  cartImageUrl: string | null;
  imageBlurUrl: string | null;
  listTitles: string[];
}

export function ListingCard({
  listing,
  priority = false,
}: {
  listing: CatalogListingCardData;
  priority?: boolean;
}) {
  const isForSale = listing.price !== null && listing.price > 0;

  return (
    <Card className="overflow-hidden py-0">
      <Link
        href={`/${listing.slug}`}
        className="group bg-muted relative block aspect-square"
      >
        {listing.imageUrl ? (
          <>
            <StorefrontBlurBackdrop url={listing.imageBlurUrl} />
            <Image
              src={listing.imageUrl}
              alt={`${listing.title} daylily`}
              fill
              sizes={catalogCardImageSizes}
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              priority={priority}
              unoptimized={!listing.imageUrl.startsWith("/")}
            />
          </>
        ) : (
          <div className="from-muted to-accent/40 text-muted-foreground grid size-full place-items-center bg-gradient-to-br text-sm">
            Image not available
          </div>
        )}
      </Link>
      <CardHeader className="px-5">
        <div className="flex flex-wrap gap-2">
          {listing.listTitles.slice(0, 2).map((title) => (
            <Badge key={title} variant="secondary">
              {title}
            </Badge>
          ))}
        </div>
        <CardTitle className="font-serif text-2xl leading-tight">
          <Link href={`/${listing.slug}`} className="hover:underline">
            {listing.title}
          </Link>
        </CardTitle>
        <p className="text-primary font-semibold">
          {isForSale ? formatCurrency(listing.price!) : "Display only"}
        </p>
      </CardHeader>
      <CardContent className="px-5">
        <p className="text-muted-foreground line-clamp-3 text-sm leading-6">
          {listing.description ?? "View cultivar details and availability."}
        </p>
      </CardContent>
      <CardFooter className="grid gap-3 px-5 pb-5">
        {isForSale ? (
          <AddToCartButton
            product={{
              id: listing.id,
              slug: listing.slug,
              title: listing.title,
              price: listing.price!,
              imageUrl: listing.cartImageUrl ?? undefined,
              isForSale: true,
            }}
          />
        ) : null}
        <Button asChild variant="outline" className="w-full">
          <Link href={`/${listing.slug}`}>
            View details{" "}
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
