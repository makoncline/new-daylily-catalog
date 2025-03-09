"use client";

import { useState } from "react";
import { type RouterOutputs } from "@/trpc/react";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { profileFormSchema } from "@/types/schemas/profile";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/trpc/react";
import { useZodForm } from "@/hooks/use-zod-form";
import { ProfileImageManager } from "@/app/dashboard/profile/_components/profile-image-manager";
import { ContentManagerFormItem } from "./content-form";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedCallback } from "use-debounce";
import { SLUG_INPUT_PATTERN } from "@/lib/utils/slugify";
import { Muted } from "@/components/typography";
import { usePro } from "@/hooks/use-pro";
import { Sparkles } from "lucide-react";
import { CheckoutButton } from "@/components/checkout-button";
import { SlugChangeConfirmDialog } from "@/components/slug-change-confirm-dialog";

type UserProfile = RouterOutputs["userProfile"]["get"];

interface ProfileFormProps {
  initialProfile: UserProfile;
}

export function ProfileForm({ initialProfile }: ProfileFormProps) {
  const { toast } = useToast();
  const [profile, setProfile] = useState(initialProfile);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const { isPro } = usePro();
  const [showSlugChangeDialog, setShowSlugChangeDialog] = useState(false);
  const [pendingSlugValue, setPendingSlugValue] = useState<string | undefined>(
    undefined,
  );

  const cleanBaseUrl = getBaseUrl().replace(/^https?:\/\//, "");

  const form = useZodForm({
    schema: profileFormSchema,
    defaultValues: {
      title: profile.title ?? undefined,
      slug: profile.slug ?? undefined,
      description: profile.description ?? undefined,
      location: profile.location ?? undefined,
      logoUrl: profile.logoUrl ?? undefined,
    },
  });

  const updateProfileMutation = api.userProfile.update.useMutation({
    onSuccess: (updatedProfile: UserProfile) => {
      setProfile(updatedProfile);
    },
    onError: () => {
      toast({
        title: "Failed to save changes",
        variant: "destructive",
      });
    },
  });

  const checkSlug = api.userProfile.checkSlug.useQuery(
    { slug: form.watch("slug") ?? undefined },
    {
      enabled: false, // Don't run automatically
      retry: false,
    },
  );

  const debouncedCheckSlug = useDebouncedCallback(
    (value: string | null | undefined) => {
      if (value && value !== profile.userId) {
        setIsCheckingSlug(true);
        void checkSlug.refetch().then((result) => {
          setIsCheckingSlug(false);
          if (result.data && !result.data.available) {
            form.setError("slug", {
              type: "manual",
              message: "This URL is already taken. Please choose another one.",
            });
          }
        });
      }
    },
    500, // Wait 500ms after typing stops
  );
  // Handle auto-save on blur
  const onFieldBlur = async (
    field: "title" | "slug" | "description" | "location" | "logoUrl",
  ) => {
    const value = form.getValues(field);
    const currentValue = profile[field];

    // Only update if the value has changed
    if (value !== currentValue) {
      // If the field is slug, show confirmation dialog
      if (field === "slug") {
        setPendingSlugValue(value ?? undefined);
        setShowSlugChangeDialog(true);
        return;
      }

      setIsUpdating(true);
      try {
        const updatedProfile = await updateProfileMutation.mutateAsync({
          data: { [field]: value },
        });
        setProfile(updatedProfile);
      } catch {
        // Error is handled by the mutation
      } finally {
        setIsUpdating(false);
      }
    }
  };

  // Handle confirm slug change
  const handleConfirmSlugChange = async () => {
    setIsUpdating(true);
    setShowSlugChangeDialog(false);
    try {
      const updatedProfile = await updateProfileMutation.mutateAsync({
        data: { slug: pendingSlugValue },
      });
      setProfile(updatedProfile);
      toast({
        title: "Profile URL updated",
        description: "Your profile URL has been successfully updated.",
      });
    } catch {
      // Error is handled by the mutation
    } finally {
      setIsUpdating(false);
      setPendingSlugValue(undefined);
    }
  };

  // Handle cancel slug change
  const handleCancelSlugChange = () => {
    setShowSlugChangeDialog(false);
    // Reset form value to current profile slug
    if (pendingSlugValue !== profile.slug) {
      form.setValue("slug", profile.slug ?? undefined);
    }
    setPendingSlugValue(undefined);
  };

  return (
    <>
      <Form {...form}>
        <form className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Garden Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    onBlur={() => onFieldBlur("title")}
                    disabled={isUpdating}
                  />
                </FormControl>
                <FormDescription>
                  The name of your garden or business.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Profile URL
                  {!isPro && (
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                  )}
                </FormLabel>
                <FormControl>
                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        pattern={SLUG_INPUT_PATTERN.source}
                        onKeyDown={(e) => {
                          // Allow special keys (backspace, delete, arrows, etc)
                          if (
                            e.key === "Backspace" ||
                            e.key === "Delete" ||
                            e.key === "ArrowLeft" ||
                            e.key === "ArrowRight" ||
                            e.key === "Tab" ||
                            e.ctrlKey ||
                            e.metaKey
                          ) {
                            return;
                          }

                          // Test if the new value would match our pattern
                          const newValue = e.currentTarget.value + e.key;
                          if (!SLUG_INPUT_PATTERN.test(newValue)) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value);
                          debouncedCheckSlug(value);
                        }}
                        onBlur={() => onFieldBlur("slug")}
                        disabled={isUpdating || !isPro}
                        placeholder={profile.userId}
                      />
                      {isCheckingSlug && (
                        <div className="absolute right-3 top-2.5">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                        </div>
                      )}
                    </div>
                    <Muted className="text-sm">
                      Your profile will be available at: {cleanBaseUrl}/
                      {field.value ?? profile.userId}
                    </Muted>
                  </div>
                </FormControl>
                <FormDescription>
                  {!isPro ? (
                    <CheckoutButton
                      variant="link"
                      className="h-auto p-0 text-xs"
                    >
                      Upgrade to Pro to customize your profile URL
                    </CheckoutButton>
                  ) : (
                    <>
                      Choose a unique URL for your public profile (minimum 5
                      characters). Only letters, numbers, hyphens, and
                      underscores are allowed.
                      {!field.value &&
                        " If not set, your user ID will be used."}
                    </>
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>Profile Images</FormLabel>
            <FormDescription>
              Upload images to showcase your garden. You can reorder them by
              dragging.
            </FormDescription>
            <ProfileImageManager initialProfile={profile} />
          </FormItem>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    onBlur={() => onFieldBlur("description")}
                    disabled={isUpdating}
                  />
                </FormControl>
                <FormDescription>
                  A brief description that appears at the top of your profile.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    onBlur={() => onFieldBlur("location")}
                    disabled={isUpdating}
                  />
                </FormControl>
                <FormDescription>
                  Optional. Your city, state, or general location.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <ContentManagerFormItem initialProfile={profile} />
        </form>
      </Form>

      <SlugChangeConfirmDialog
        open={showSlugChangeDialog}
        onOpenChange={setShowSlugChangeDialog}
        onConfirm={handleConfirmSlugChange}
        onCancel={handleCancelSlugChange}
        oldSlug={profile.slug ?? profile.userId}
        newSlug={pendingSlugValue ?? profile.userId}
        baseUrl={cleanBaseUrl}
      />
    </>
  );
}
