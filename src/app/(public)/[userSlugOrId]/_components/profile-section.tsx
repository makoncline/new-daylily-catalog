"use client";

import { Badge } from "@/components/ui/badge";
import {
  LocationBadge,
  ListingCountBadge,
  ListCountBadge,
  LastUpdatedBadge,
  MemberSince,
} from "@/components/profile/profile-badges";
import { type RouterOutputs } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";
import { H1, P } from "@/components/typography";

interface ProfileSectionProps {
  profile: RouterOutputs["public"]["getProfile"];
}

export function ProfileSection({ profile }: ProfileSectionProps) {
  return (
    <div id="profile" className="space-y-2">
      <div className="flex items-center gap-2">
        {profile.hasActiveSubscription && (
          <Badge variant="secondary">Pro</Badge>
        )}
        {profile.updatedAt && (
          <LastUpdatedBadge date={new Date(profile.updatedAt)} />
        )}
      </div>
      <H1 className="text-[clamp(24px,_5vw,_48px)]">
        {profile.title ?? "Unnamed Garden"}
      </H1>
      <div className="flex items-center gap-2">
        {profile.location && <LocationBadge location={profile.location} />}
        {profile.createdAt && (
          <MemberSince date={new Date(profile.createdAt)} />
        )}
      </div>

      {profile.description && (
        <P className="text-lg text-muted-foreground">{profile.description}</P>
      )}

      <div className="flex gap-2">
        <ListingCountBadge count={profile._count.listings} />
        <ListCountBadge count={profile.lists.length} lists={profile.lists} />
      </div>
    </div>
  );
}

export function ProfileSectionSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-5 w-1/6" />
      <Skeleton className="h-8 w-5/6" />
      <Skeleton className="h-5 w-2/6" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-5 w-3/6" />
    </div>
  );
}
