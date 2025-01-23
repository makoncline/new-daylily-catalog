"use client";

import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { type RouterOutputs } from "@/trpc/react";

interface ProfileSectionProps {
  profile: RouterOutputs["public"]["getProfile"];
}

export function ProfileSection({ profile }: ProfileSectionProps) {
  return (
    <div id="profile" className="space-y-4">
      <h1 className="text-3xl font-bold">{profile.name ?? "Unnamed Garden"}</h1>
      {profile.location && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            <MapPin className="mr-1 h-3 w-3" />
            {profile.location}
          </Badge>
        </div>
      )}
      {profile.intro && (
        <p className="text-lg text-muted-foreground">{profile.intro}</p>
      )}
    </div>
  );
}
