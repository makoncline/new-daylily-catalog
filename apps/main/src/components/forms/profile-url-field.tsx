"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import { Sparkles } from "lucide-react";
import { api } from "@/trpc/react";
import { usePro } from "@/hooks/use-pro";
import type { ProfileFormState, UserProfile } from "@/hooks/use-profile-form";
import { slugSchema } from "@/types/schemas/profile";
import { SLUG_INPUT_PATTERN } from "@/lib/utils/slugify";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { CheckoutButton } from "@/components/checkout-button";
import { SlugChangeConfirmDialog } from "@/components/slug-change-confirm-dialog";
import { useDashboardSectionFocus } from "@/hooks/use-dashboard-section-focus";

export function ProfileUrlField({
  form,
  profile,
  disabled,
}: {
  form: ProfileFormState["form"];
  profile: UserProfile;
  disabled: boolean;
}) {
  useDashboardSectionFocus("profile-url");
  const { isPro } = usePro();
  const utils = api.useUtils();
  const value = useWatch({ control: form.control, name: "slug" });
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState<string | null>(null);
  const isChecking = checkingSlug !== null && checkingSlug === value;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const skipFocusWarningRef = useRef(false);
  const { getValues, clearErrors, setError } = form;
  const baseUrl = getBaseUrl().replace(/^https?:\/\//, "");

  useEffect(() => {
    let active = true;
    if (
      !isUnlocked ||
      !value ||
      value === profile.userId ||
      value === profile.slug ||
      !slugSchema.safeParse(value).success
    )
      return;
    const timer = setTimeout(() => {
      setCheckingSlug(value);
      void utils.dashboardDb.userProfile.checkSlug
        .fetch({ slug: value })
        .then((result) => {
          if (!active || getValues("slug") !== value) return;
          if (result.available) clearErrors("slug");
          else
            setError("slug", {
              type: "availability",
              message: "This URL is already taken. Please choose another one.",
            });
        })
        .catch(() => {
          if (!active || getValues("slug") !== value) return;
          setError("slug", {
            type: "availability",
            message: "Could not check this URL. Try again or save to check it.",
          });
        })
        .finally(() => {
          if (active) setCheckingSlug(null);
        });
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    value,
    isUnlocked,
    profile.userId,
    profile.slug,
    getValues,
    clearErrors,
    setError,
    utils,
  ]);

  function openWarning() {
    if (isPro && !disabled && !isUnlocked) setShowWarning(true);
  }

  return (
    <>
      <Controller
        control={form.control}
        name="slug"
        render={({ field, fieldState }) => (
          <Field
            id="profile-url"
            data-invalid={fieldState.invalid}
            data-disabled={disabled || !isPro}
          >
            <FieldLabel htmlFor={`${form.id}-slug`}>
              Profile URL {!isPro && <Sparkles aria-hidden="true" />}
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                id={`${form.id}-slug`}
                name={field.name}
                ref={(element) => {
                  field.ref(element);
                  inputRef.current = element;
                }}
                value={field.value ?? ""}
                pattern={SLUG_INPUT_PATTERN.source}
                aria-invalid={fieldState.invalid}
                aria-describedby={`${form.id}-slug-help ${form.id}-slug-error`}
                readOnly={!isUnlocked}
                disabled={disabled || !isPro}
                placeholder={profile.userId}
                onPointerDown={(event) => {
                  if (isPro && !disabled && !isUnlocked) {
                    event.preventDefault();
                    openWarning();
                  }
                }}
                onFocus={() => {
                  if (skipFocusWarningRef.current) {
                    skipFocusWarningRef.current = false;
                    return;
                  }
                  openWarning();
                }}
                onChange={(event) => {
                  form.clearErrors("slug");
                  field.onChange(event.target.value);
                }}
                onBlur={(event) => {
                  field.onBlur();
                  if (!slugSchema.safeParse(event.currentTarget.value).success)
                    void form.trigger("slug");
                }}
              />
              {isChecking && (
                <InputGroupAddon align="inline-end">
                  <Spinner aria-label="Checking profile URL" />
                </InputGroupAddon>
              )}
            </InputGroup>
            <FieldDescription id={`${form.id}-slug-help`}>
              Your profile will be available at: {baseUrl}/
              {field.value === ""
                ? profile.userId
                : (field.value ?? profile.userId)}
            </FieldDescription>
            {isPro ? (
              <FieldDescription>
                Choose a unique URL for your public profile (minimum 5
                characters). Only letters, numbers, hyphens, and underscores are
                allowed.{" "}
                {!field.value && "If not set, your user ID will be used."}
              </FieldDescription>
            ) : (
              <div>
                <CheckoutButton variant="link">
                  Upgrade to Pro to customize your profile URL
                </CheckoutButton>
              </div>
            )}
            <FieldError
              id={`${form.id}-slug-error`}
              errors={[fieldState.error]}
            />
          </Field>
        )}
      />
      <SlugChangeConfirmDialog
        open={showWarning}
        onOpenChange={setShowWarning}
        onConfirm={() => {
          setIsUnlocked(true);
          setShowWarning(false);
        }}
        onCancel={() => setShowWarning(false)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          skipFocusWarningRef.current = !isUnlocked;
          inputRef.current?.focus();
        }}
        currentSlug={profile.slug ?? profile.userId}
        baseUrl={baseUrl}
      />
    </>
  );
}
