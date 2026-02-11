import Link from "next/link";
import { ArrowUpRight, Clock, Flower2, ListChecks, MapPin } from "lucide-react";
import { CultivarCatalogListingRow } from "@/components/cultivar-catalog-listing-row";
import { ImagePopover } from "@/components/image-popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { H3, Muted, P } from "@/components/typography";
import type { CultivarPageCatalog } from "@/types";

interface CultivarCatalogCardProps {
  catalog: CultivarPageCatalog;
}

function getLastUpdatedLabel(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < 7) {
    return "Recently Updated";
  }

  if (days < 30) {
    return "Updated This Month";
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `Updated ${months} ${months === 1 ? "month" : "months"} ago`;
  }

  const years = Math.floor(months / 12);
  return `Updated ${years} ${years === 1 ? "year" : "years"} ago`;
}

function getMemberSinceLabel(date: Date) {
  const now = new Date();
  const months =
    (now.getFullYear() - date.getFullYear()) * 12 +
    now.getMonth() -
    date.getMonth();

  if (months < 1) {
    return "New member";
  }

  if (months < 12) {
    return `Member for ${months} months`;
  }

  const years = Math.floor(months / 12);
  return `Member for ${years} ${years === 1 ? "year" : "years"}`;
}

export function CultivarCatalogCard({ catalog }: CultivarCatalogCardProps) {
  const catalogHref = `/${catalog.slug}`;
  const lastUpdatedLabel = getLastUpdatedLabel(new Date(catalog.updatedAt));
  const memberSinceLabel = getMemberSinceLabel(new Date(catalog.createdAt));

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
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                <span>{lastUpdatedLabel}</span>
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {catalog.location && (
                <Badge variant="secondary" className="max-w-52 items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{catalog.location}</span>
                </Badge>
              )}
              <Muted className="text-xs">{memberSinceLabel}</Muted>
            </div>

            {catalog.description && (
              <P className="line-clamp-2 text-muted-foreground">
                {catalog.description}
              </P>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <Flower2 className="h-3 w-3" />
                <span>{catalog.listingCount} listings</span>
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <ListChecks className="h-3 w-3" />
                <span>{catalog.listCount} lists</span>
              </Badge>
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
