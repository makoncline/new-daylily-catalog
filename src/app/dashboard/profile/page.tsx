"use server";

import { api } from "@/trpc/server";
import { ProfileForm } from "@/components/forms/profile-form";
import { PageHeader } from "../_components/page-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MainContent } from "@/app/(public)/_components/main-content";

export default async function ProfilePage() {
  const profile = await api.userProfile.get();
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
