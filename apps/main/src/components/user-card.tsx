"use client";

import { Flower2, Clock } from "lucide-react";
import { OptimizedImage } from "@/components/optimized-image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/truncated-text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { type RouterOutputs } from "@/trpc/react";
import { H3, Muted } from "@/components/typography";
import { ImagePlaceholder } from "./image-placeholder";
import { ImagePopover } from "@/components/image-popover";
import { LocationBadge } from "./profile/profile-badges";

function getLastUpdatedLabel(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < 7) return "Recently Updated";
  if (days < 30) return "Updated this month";
  return null;
}

function getMemberSinceLabel(date: Date) {
  const now = new Date();
  const months =
    (now.getFullYear() - date.getFullYear()) * 12 +
    now.getMonth() -
    date.getMonth();

  if (months < 1) return "New member";
  if (months < 12) return `Member for ${months} months`;
  const years = Math.floor(months / 12);
  return `Member for ${years} ${years === 1 ? "year" : "years"}`;
}

type UserCardProps = RouterOutputs["public"]["getPublicProfiles"][number] & {
  priority: boolean;
};

export function UserCard({
  id,
  title,
  description,
  location,
  images,
  listingCount,
  hasActiveSubscription,
  createdAt,
  updatedAt,
  slug,
  priority = false,
}: UserCardProps) {
  const gardenName = title ?? "Unnamed Garden";
  const lastUpdatedLabel = getLastUpdatedLabel(new Date(updatedAt));
  const memberSinceLabel = getMemberSinceLabel(new Date(createdAt));
  const visiblePath = `/${slug ?? id}`;

  return (
    <Card className="group hover:border-primary flex h-full flex-col overflow-hidden transition-all">
      <div className="relative">
        <Link href={visiblePath} className="block">
          {images[0]?.url ? (
            <OptimizedImage
              image={images[0]}
              alt={`${gardenName} profile image`}
              size="full"
              priority={priority}
              className="object-cover"
            />
          ) : (
            <ImagePlaceholder />
          )}
        </Link>

        <div className="absolute top-2 right-2">
          {/* Pro Badge */}
          {hasActiveSubscription && (
            <Badge
              variant="secondary"
              className="bg-background/80 backdrop-blur-sm"
            >
              Pro
            </Badge>
          )}
        </div>

        {/* Recently Updated Badge */}
        {lastUpdatedLabel && (
          <div className="absolute right-2 bottom-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="outline"
                    className="bg-background/80 backdrop-blur-sm"
                  >
                    <Clock className="size-3" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" align="end" className="p-2">
                  {lastUpdatedLabel}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Images Preview Tooltip */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-2">
            <ImagePopover
              images={images}
              size="sm"
              className="bg-background/80 backdrop-blur-sm"
            />
          </div>
        )}
      </div>

      <Link href={visiblePath} className="flex flex-1 flex-col">
        <CardContent className="flex flex-1 flex-col p-4">
          <div className="flex flex-1 flex-col justify-between gap-4">
            <div className="space-y-2">
              <H3>
                <TruncatedText text={gardenName} lines={1} />
              </H3>

              {location && <LocationBadge location={location} />}

              <Muted className="text-xs">{memberSinceLabel}</Muted>

              {description && (
                <TruncatedText
                  text={description}
                  lines={3}
                  className="text-muted-foreground text-sm"
                />
              )}
            </div>

            <div className="text-muted-foreground flex gap-3 text-sm">
              <Badge
                variant="secondary"
                className="flex items-center gap-1 text-xs"
              >
                <Flower2 className="size-3" />
                <span>{listingCount} listings</span>
              </Badge>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
