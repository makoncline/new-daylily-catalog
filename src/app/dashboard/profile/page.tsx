"use server";

import { Suspense } from "react";
import { api } from "@/trpc/server";
import { ProfileForm } from "@/components/forms/profile-form";
import { BioManagerFormItem } from "@/components/forms/bio-form";

export default async function ProfilePage() {
  return (
    <div className="container py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
            <p className="text-sm text-muted-foreground">
              Manage your profile information and garden details.
            </p>
          </div>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <ProfileFormFetcher />
        </Suspense>
      </div>
    </div>
  );
}

async function ProfileFormFetcher() {
  const profile = await api.userProfile.get();
  return <ProfileForm initialProfile={profile} />;
}
