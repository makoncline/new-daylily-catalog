"use client";

import { ImageIcon, MapPin, Flower2, ListChecks, Clock } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";

function UserImagesPreview({ images }: { images: { url: string }[] }) {
  if (!images.length) return null;

  return (
    <div className="grid max-w-[300px] grid-cols-2 gap-2 p-2">
      {images.map((image, i) => (
        <div key={i} className="aspect-square overflow-hidden rounded-md">
          <OptimizedImage
            src={image.url}
            alt={`Profile image ${i + 1}`}
            size="thumbnail"
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

function UserListsPreview({
  lists,
}: {
  lists: { id: string; title: string; listingCount: number }[];
}) {
  if (!lists.length) return null;

  return (
    <div className="flex max-w-[300px] flex-col gap-2 p-2">
      {lists.map((list) => (
        <div key={list.id} className="flex items-center justify-between gap-4">
          <span className="font-medium">{list.title}</span>
          <Badge variant="secondary" className="text-xs">
            {list.listingCount} listings
          </Badge>
        </div>
      ))}
    </div>
  );
}

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
  listCount,
  hasActiveSubscription,
  createdAt,
  updatedAt,
  lists,
  priority = false,
}: UserCardProps) {
  const gardenName = title ?? "Unnamed Garden";
  const lastUpdatedLabel = getLastUpdatedLabel(new Date(updatedAt));
  const memberSinceLabel = getMemberSinceLabel(new Date(createdAt));

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-all hover:border-primary">
      <div className="relative">
        <Link href={`/catalogs/${id}`} className="block">
          <div className="aspect-square">
            {images[0]?.url ? (
              <OptimizedImage
                src={images[0].url}
                alt={`${gardenName} profile image`}
                size="full"
                priority={priority}
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>
        </Link>

        <div className="absolute right-2 top-2">
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
          <div className="absolute bottom-2 right-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="outline"
                    className="bg-background/80 backdrop-blur-sm"
                  >
                    <Clock className="h-3 w-3" />
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="cursor-pointer">
                    <Badge
                      variant="secondary"
                      className="bg-background/80 backdrop-blur-sm"
                    >
                      <ImageIcon className="h-3 w-3" />
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" align="start" className="p-0">
                  <UserImagesPreview images={images} />
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      <Link href={`/catalogs/${id}`} className="flex flex-1 flex-col">
        <CardContent className="flex flex-1 flex-col p-4">
          <div className="flex flex-1 flex-col justify-between gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">
                <TruncatedText text={gardenName} maxLength={30} />
              </h3>

              {location && (
                <Badge
                  variant="secondary"
                  className="inline-flex items-center gap-1"
                >
                  <MapPin className="h-3 w-3" />
                  <TruncatedText text={location} maxLength={35} />
                </Badge>
              )}

              <p className="text-xs text-muted-foreground">
                {memberSinceLabel}
              </p>

              {description && (
                <TruncatedText
                  text={description}
                  maxLength={100}
                  as="p"
                  className="text-sm text-muted-foreground"
                />
              )}
            </div>

            <div className="flex gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 text-xs"
                >
                  <Flower2 className="h-3 w-3" />
                  <span>{listingCount} listings</span>
                </Badge>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge
                      variant="secondary"
                      className="flex cursor-pointer items-center gap-1 text-xs"
                    >
                      <ListChecks className="h-3 w-3" />
                      <span>{listCount} lists</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start" className="p-0">
                    <UserListsPreview lists={lists} />
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

export function UserCardSkeleton() {
  return (
    <Card className="group flex h-full flex-col overflow-hidden">
      <div className="relative">
        <div className="aspect-square">
          <Skeleton className="h-full w-full" />
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex flex-1 flex-col justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>

          <div className="flex gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
