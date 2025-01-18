"use server";

import { api } from "@/trpc/server";
import { ProfileForm } from "@/components/forms/profile-form";
import { PageHeader } from "../_components/page-header";

export default async function ProfilePage() {
  const profile = await api.userProfile.get();
  return (
    <>
      <PageHeader
        heading="Profile"
        text="Manage your profile information and garden details."
      />
      <ProfileForm initialProfile={profile} />
    </>
  );
}
