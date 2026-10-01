"use client";

import {
  useProfileForm,
  type ProfileFormHandle,
  type UserProfile,
} from "@/hooks/use-profile-form";
import { ProfileTextFields } from "./profile-text-fields";
import { ContentManagerFormItem } from "./content-form";
import { ProfileImageManager } from "@/app/dashboard/profile/_components/profile-image-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";

export type { ProfileFormHandle } from "@/hooks/use-profile-form";

export function ProfileForm({
  initialProfile,
  formRef,
}: {
  initialProfile: UserProfile;
  formRef?: React.RefObject<ProfileFormHandle | null>;
}) {
  const state = useProfileForm(initialProfile, formRef);
  const draftSlug = state.form.getValues("slug");
  const publicSlug =
    draftSlug === ""
      ? state.profile.userId
      : (draftSlug ?? state.profile.userId);
  return (
    <>
      <PageHeader
        heading="Profile"
        text="Manage your profile information and garden details."
      >
        <Button asChild>
          <Link href={`/${publicSlug}`}>View Public Profile</Link>
        </Button>
      </PageHeader>
      <form
        onSubmit={state.form.handleSubmit(() => state.saveChanges("manual"))}
        noValidate
      >
        <FieldGroup>
          <Card>
            <CardHeader>
              <CardTitle>Garden Details</CardTitle>
              <CardDescription>
                Manage the information on your public profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileTextFields
                form={state.form}
                profile={state.profile}
                disabled={state.isSaving}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Profile Images</CardTitle>
              <CardDescription>
                Upload images to showcase your garden. You can reorder them by
                dragging.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileImageManager
                profileId={state.profile.id}
                onMutationSuccess={state.markNeedsParentCommit}
              />
            </CardContent>
          </Card>
          <ContentManagerFormItem
            initialProfile={state.profile}
            formRef={state.contentFormRef}
            onMutationSuccess={state.markNeedsParentCommit}
            onDirtyChange={state.onContentDirtyChange}
          />
          {state.saveError && (
            <Alert variant="destructive">
              <AlertTitle>Changes were not saved</AlertTitle>
              <AlertDescription>
                {state.saveError} Your changes are still here. Try again.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={state.isSaving || !state.hasPendingChanges()}
            >
              {state.isSaving && <Spinner data-icon="inline-start" />} Save
              Changes
            </Button>
          </div>
        </FieldGroup>
      </form>
    </>
  );
}
