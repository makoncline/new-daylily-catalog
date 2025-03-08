"use client";

import { api } from "@/trpc/react";
import { ProfileForm } from "@/components/forms/profile-form";
import { PageHeader } from "../_components/page-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MainContent } from "@/app/(public)/_components/main-content";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  // Fetch profile data on the client side
  const { data: profile, isLoading } = api.userProfile.get.useQuery();

  if (isLoading || !profile) {
    return (
      <MainContent>
        <PageHeader heading="Profile" text="Loading profile information..." />
        <div className="space-y-8">
          {/* Form field skeletons */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}

          {/* Text area skeletons */}
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </MainContent>
    );
  }

  return (
    <MainContent>
      <PageHeader
        heading="Profile"
        text="Manage your profile information and garden details."
      >
        <Button>
          <Link href={`/${profile.slug}`}>View Public Profile</Link>
        </Button>
      </PageHeader>
      <ProfileForm initialProfile={profile} />
    </MainContent>
  );
}
