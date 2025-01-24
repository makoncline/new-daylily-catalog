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
      <div className="flex items-start justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold">
            {profile.title ?? "Unnamed Garden"}
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {profile.location && <LocationBadge location={profile.location} />}
        {profile.createdAt && (
          <MemberSince date={new Date(profile.createdAt)} />
        )}
      </div>

      {profile.description && (
        <p className="text-lg text-muted-foreground">{profile.description}</p>
      )}

      <div className="flex gap-3">
        <ListingCountBadge count={profile._count?.listings ?? 0} />
        <ListCountBadge count={profile.lists.length} lists={profile.lists} />
      </div>
    </div>
  );
}
