"use client";

import { Controller } from "react-hook-form";
import type { ProfileFormState, UserProfile } from "@/hooks/use-profile-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProfileUrlField } from "./profile-url-field";

export function ProfileTextFields({
  form,
  profile,
  disabled,
}: {
  form: ProfileFormState["form"];
  profile: UserProfile;
  disabled: boolean;
}) {
  return (
    <FieldGroup>
      <Controller
        control={form.control}
        name="title"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
            <FieldLabel htmlFor={`${form.id}-title`}>Garden Name</FieldLabel>
            <Input
              {...field}
              id={`${form.id}-title`}
              value={field.value ?? ""}
              disabled={disabled}
              aria-invalid={fieldState.invalid}
              aria-describedby={`${form.id}-title-help ${form.id}-title-error`}
            />
            <FieldDescription id={`${form.id}-title-help`}>
              The name of your garden or business.
            </FieldDescription>
            <FieldError
              id={`${form.id}-title-error`}
              errors={[fieldState.error]}
            />
          </Field>
        )}
      />
      <ProfileUrlField form={form} profile={profile} disabled={disabled} />
      <Controller
        control={form.control}
        name="description"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
            <FieldLabel htmlFor={`${form.id}-description`}>
              Description
            </FieldLabel>
            <Textarea
              {...field}
              id={`${form.id}-description`}
              value={field.value ?? ""}
              disabled={disabled}
              aria-invalid={fieldState.invalid}
              aria-describedby={`${form.id}-description-help ${form.id}-description-error`}
            />
            <FieldDescription id={`${form.id}-description-help`}>
              A brief description that appears at the top of your profile.
            </FieldDescription>
            <FieldError
              id={`${form.id}-description-error`}
              errors={[fieldState.error]}
            />
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name="location"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
            <FieldLabel htmlFor={`${form.id}-location`}>Location</FieldLabel>
            <Input
              {...field}
              id={`${form.id}-location`}
              value={field.value ?? ""}
              disabled={disabled}
              aria-invalid={fieldState.invalid}
              aria-describedby={`${form.id}-location-help ${form.id}-location-error`}
            />
            <FieldDescription id={`${form.id}-location-help`}>
              Optional. Your city, state, or general location.
            </FieldDescription>
            <FieldError
              id={`${form.id}-location-error`}
              errors={[fieldState.error]}
            />
          </Field>
        )}
      />
    </FieldGroup>
  );
}
