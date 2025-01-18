"use server";

import { Suspense } from "react";
import { api } from "@/trpc/server";
import { ProfileForm } from "@/components/forms/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
  return (
    <div className="container py-6">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Loading...</div>}>
              <ProfileFormFetcher />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function ProfileFormFetcher() {
  const profile = await api.userProfile.get();
  return <ProfileForm initialProfile={profile} />;
}
