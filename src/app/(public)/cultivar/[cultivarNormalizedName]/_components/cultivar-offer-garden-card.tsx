"use client";

import Link from "next/link";
import { Clock, Flower2, ListChecks } from "lucide-react";
import { ImagePopover } from "@/components/image-popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LocationBadge } from "@/components/profile/profile-badges";
import { H3, Muted, P } from "@/components/typography";
import { formatRelativeDate } from "@/lib/utils";
import { type RouterOutputs } from "@/trpc/react";
import { CultivarOfferRow } from "./cultivar-offer-row";

type CultivarPageOutput = NonNullable<
  RouterOutputs["public"]["getCultivarPage"]
>;
type OfferGardenCard = CultivarPageOutput["offers"]["gardenCards"][number];

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

interface CultivarOfferGardenCardProps {
  gardenCard: OfferGardenCard;
}

export function CultivarOfferGardenCard({
  gardenCard,
}: CultivarOfferGardenCardProps) {
  const catalogHref = `/${gardenCard.slug}`;
  const memberSinceLabel = getMemberSinceLabel(new Date(gardenCard.createdAt));
  const updatedLabel = formatRelativeDate(new Date(gardenCard.updatedAt));

  return (
    <Card
      data-testid="cultivar-offer-garden-card"
      data-garden-slug={gardenCard.slug}
    >
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-2">
              {gardenCard.profileImages.length > 0 && (
                <ImagePopover
                  images={gardenCard.profileImages}
                  size="sm"
                  className="border"
                />
              )}

              <H3 className="text-3xl leading-tight">
                <Link href={catalogHref} className="hover:underline">
                  {gardenCard.title}
                </Link>
              </H3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {gardenCard.location && (
                <LocationBadge location={gardenCard.location} />
              )}
              <Muted className="text-xs">{memberSinceLabel}</Muted>
            </div>

            {gardenCard.description && (
              <P className="text-muted-foreground line-clamp-2">
                {gardenCard.description}
              </P>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="flex items-center gap-1 text-xs whitespace-nowrap"
              >
                <Flower2 className="h-3 w-3" />
                <span>{gardenCard.listingCount} listings</span>
              </Badge>
              <Badge
                variant="secondary"
                className="flex items-center gap-1 text-xs whitespace-nowrap"
              >
                <ListChecks className="h-3 w-3" />
                <span>{gardenCard.listCount} lists</span>
              </Badge>
            </div>
          </div>

          <Button
            asChild
            size="sm"
            variant="outline"
            className="w-full md:w-auto"
          >
            <Link href={catalogHref}>View Catalog</Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto pb-2">
          <div className="flex w-max gap-3">
            {gardenCard.offers.map((offer) => (
              <div
                key={offer.id}
                className="w-[82vw] min-w-[82vw] md:w-[520px] md:min-w-[520px]"
              >
                <CultivarOfferRow sellerSlug={gardenCard.slug} offer={offer} />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
