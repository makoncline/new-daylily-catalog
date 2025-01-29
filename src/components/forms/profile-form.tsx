"use client";

import { useState } from "react";
import { type RouterOutputs } from "@/trpc/react";
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

type UserProfile = RouterOutputs["userProfile"]["get"];

interface ProfileFormProps {
  initialProfile: UserProfile;
}

export function ProfileForm({ initialProfile }: ProfileFormProps) {
  const { toast } = useToast();
  const [profile, setProfile] = useState(initialProfile);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

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

  return (
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
              <FormLabel>Profile URL</FormLabel>
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
                      disabled={isUpdating}
                      placeholder={profile.userId}
                    />
                    {isCheckingSlug && (
                      <div className="absolute right-3 top-2.5">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                      </div>
                    )}
                  </div>
                  <Muted className="text-sm">
                    Your profile will be available at: www.app_url.com/catalog/
                    {field.value ?? profile.userId}
                  </Muted>
                </div>
              </FormControl>
              <FormDescription>
                Choose a unique URL for your public profile (minimum 5
                characters). Only letters, numbers, hyphens, and underscores are
                allowed.
                {!field.value && " If not set, your user ID will be used."}
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
  );
}
