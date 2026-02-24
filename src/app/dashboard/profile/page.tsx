"use client";

import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import {
  ProfileForm,
  type ProfileFormHandle,
} from "@/components/forms/profile-form";
import { PageHeader } from "../_components/page-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MainContent } from "@/app/(public)/_components/main-content";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const formRef = useRef<ProfileFormHandle | null>(null);
  const { data: profile, isLoading } = api.dashboardDb.userProfile.get.useQuery();

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!formRef.current?.hasPendingChanges()) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (!formRef.current?.hasPendingChanges()) {
        return;
      }

      // eslint-disable-next-line react-hooks/exhaustive-deps -- needs latest imperative form handle on page unmount.
      void formRef.current.saveChanges("navigate");
    };
  }, []);

  if (isLoading || !profile) {
    return (
      <MainContent>
        <PageHeader heading="Profile" text="Loading profile information..." />
        <div className="space-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}

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

  const publicSlug = profile.slug ?? profile.userId;

  return (
    <MainContent>
      <PageHeader
        heading="Profile"
        text="Manage your profile information and garden details."
      >
        <Button asChild>
          <Link href={`/${publicSlug}`}>View Public Profile</Link>
        </Button>
      </PageHeader>
      <ProfileForm
        initialProfile={profile}
        formRef={formRef}
      />
    </MainContent>
  );
}
