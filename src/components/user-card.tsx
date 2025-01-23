"use client";

import { MapPin, Flower2, ListChecks } from "lucide-react";
import { OptimizedImage } from "@/components/optimized-image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/truncated-text";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface UserCardProps {
  id: string;
  name: string | null;
  intro: string | null;
  location: string | null;
  images: { url: string }[];
  listingCount: number;
  listCount: number;
  hasActiveSubscription: boolean;
  priority?: boolean;
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

export function UserCard({
  id,
  name,
  intro,
  location,
  images,
  listingCount,
  listCount,
  hasActiveSubscription,
  priority = false,
}: UserCardProps) {
  const profileImage = images[0]?.url ?? "/placeholders/garden.jpg";
  const gardenName = name ?? "Unnamed Garden";

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-all hover:border-primary">
      <div className="relative">
        <Link href={`/catalogs/${id}`} className="block">
          <div className="aspect-square">
            <OptimizedImage
              src={profileImage}
              alt={`${gardenName} profile image`}
              size="full"
              priority={priority}
              className="object-cover"
            />
          </div>
        </Link>
        {hasActiveSubscription && (
          <div className="absolute right-2 top-2">
            <Badge
              variant="secondary"
              className="bg-background/80 backdrop-blur-sm"
            >
              Pro
            </Badge>
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

              {intro && (
                <TruncatedText
                  text={intro}
                  maxLength={100}
                  as="p"
                  className="text-sm text-muted-foreground"
                />
              )}
            </div>

            <div className="flex gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Flower2 className="h-3 w-3" />
                <span>{listingCount} listings</span>
              </div>
              <div className="flex items-center gap-1">
                <ListChecks className="h-3 w-3" />
                <span>{listCount} lists</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
