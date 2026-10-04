"use client";

import { useRef } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { MainContent } from "@/app/(public)/_components/main-content";
import { Skeleton } from "@/components/ui/skeleton";
import { useSaveBeforeNavigate } from "@/hooks/use-save-before-navigate";
import {
  ProfileForm,
  type ProfileFormHandle,
} from "@/components/forms/profile-form";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field, FieldGroup } from "@/components/ui/field";
import { getErrorMessage } from "@/lib/error-utils";

export default function ProfilePage() {
  const formRef = useRef<ProfileFormHandle | null>(null);
  useSaveBeforeNavigate(formRef, "navigate");

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = api.dashboardDb.userProfile.get.useQuery();

  if (error && !profile)
    return (
      <MainContent>
        <PageHeader
          heading="Profile"
          text="Manage your profile information and garden details."
        />
        <Alert variant="destructive">
          <AlertTitle>Profile could not load</AlertTitle>
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => void refetch()}>Try Again</Button>
        </div>
      </MainContent>
    );

  if (isLoading || !profile) {
    return (
      <MainContent>
        <PageHeader heading="Profile" text="Loading profile information..." />
        <FieldGroup aria-label="Loading profile" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Field key={i}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </Field>
          ))}

          {Array.from({ length: 2 }).map((_, i) => (
            <Field key={i}>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full" />
            </Field>
          ))}
        </FieldGroup>
      </MainContent>
    );
  }

  return (
    <MainContent>
      <ProfileForm initialProfile={profile} formRef={formRef} />
    </MainContent>
  );
}
