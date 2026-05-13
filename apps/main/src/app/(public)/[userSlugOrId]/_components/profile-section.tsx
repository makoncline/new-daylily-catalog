"use client";

import { Badge } from "@/components/ui/badge";
import {
  LocationBadge,
  ListingCountBadge,
  ListCountBadge,
  LastUpdatedBadge,
  MemberSince,
} from "@/components/profile/profile-badges";
import { FloatingCartButton } from "@/components/floating-cart-button";
import { type RouterOutputs } from "@/trpc/react";
import { H1, P } from "@/components/typography";

interface ProfileSectionProps {
  profile: RouterOutputs["public"]["getProfile"];
}

export function ProfileSection({ profile }: ProfileSectionProps) {
  const updatedAtTimestamp = profile.updatedAt
    ? Date.parse(String(profile.updatedAt))
    : null;
  const createdAtTimestamp = profile.createdAt
    ? Date.parse(String(profile.createdAt))
    : null;

  return (
    <div id="profile" className="space-y-2">
      <div className="flex items-center gap-2">
        {profile.hasActiveSubscription && (
          <Badge variant="secondary">Pro</Badge>
        )}
        {updatedAtTimestamp && (
          <LastUpdatedBadge timestamp={updatedAtTimestamp} />
        )}
      </div>
      <H1 className="text-[clamp(24px,5vw,48px)]">
        {profile.title ?? "Unnamed Garden"}
      </H1>
      <div className="flex items-center gap-2">
        {profile.location && <LocationBadge location={profile.location} />}
        {createdAtTimestamp && <MemberSince timestamp={createdAtTimestamp} />}
      </div>

      {profile.description && (
        <P className="text-muted-foreground text-lg">{profile.description}</P>
      )}

      <div className="flex gap-2">
        <ListingCountBadge count={profile._count.listings} />
        <ListCountBadge count={profile.listCount} lists={profile.lists} />
      </div>

      <FloatingCartButton
        userId={profile.id}
        userName={profile.title ?? undefined}
        showTopButton
      />
    </div>
  );
}
