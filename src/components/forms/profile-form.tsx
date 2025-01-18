"use client";

import { useState } from "react";
import { type Image } from "@prisma/client";
import { type RouterOutputs } from "@/trpc/react";
import {
  profileFormSchema,
  type ProfileFormData,
} from "@/types/schemas/profile";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { ImageManager } from "@/components/image-manager";
import { ImageUpload } from "@/components/image-upload";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/trpc/react";
import { useZodForm } from "@/hooks/use-zod-form";

type UserProfile = RouterOutputs["userProfile"]["get"];

interface ProfileFormProps {
  initialProfile: UserProfile;
}

export function ProfileForm({ initialProfile }: ProfileFormProps) {
  const { toast } = useToast();
  const [profile, setProfile] = useState(initialProfile);
  const [images, setImages] = useState(initialProfile.images);
  const [isPending, setIsPending] = useState(false);

  const updateProfileMutation = api.userProfile.update.useMutation({
    onSuccess: (updatedProfile: UserProfile) => {
      setProfile(updatedProfile);
      toast({
        title: "Changes saved",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save changes",
        variant: "destructive",
      });
    },
  });

  const form = useZodForm({
    schema: profileFormSchema,
    defaultValues: {
      intro: profile.intro ?? undefined,
      bio: profile.bio ?? undefined,
      userLocation: profile.userLocation ?? undefined,
      logoUrl: profile.logoUrl ?? undefined,
    },
  });

  // Handle auto-save on blur
  const onFieldBlur = async (field: keyof ProfileFormData) => {
    const value = form.getValues(field);
    const initialValue = profile[field] ?? undefined;

    // Only save if the value has changed
    if (value !== initialValue) {
      setIsPending(true);
      try {
        const updatedProfile = await updateProfileMutation.mutateAsync({
          data: {
            [field]: value,
          },
        });
        setProfile(updatedProfile);
      } finally {
        setIsPending(false);
      }
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-8">
        <FormField
          control={form.control}
          name="intro"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Introduction</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  onBlur={() => onFieldBlur("intro")}
                />
              </FormControl>
              <FormDescription>
                A brief introduction that appears at the top of your profile.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  onBlur={() => onFieldBlur("bio")}
                />
              </FormControl>
              <FormDescription>
                Tell visitors about yourself and your garden.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="userLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  onBlur={() => onFieldBlur("userLocation")}
                />
              </FormControl>
              <FormDescription>
                Optional. Your city, state, or general location.
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
          <div className="space-y-4">
            <ImageManager
              type="profile"
              images={images}
              onImagesChange={setImages}
              referenceId={profile.id}
            />
            <div className="p-4">
              <ImageUpload
                type="profile"
                referenceId={profile.id}
                onUploadComplete={(result) => {
                  if (result.success && result.image) {
                    setImages((prev: Image[]) => [...prev, result.image]);
                    toast({
                      title: "Image added successfully",
                    });
                  }
                }}
              />
            </div>
          </div>
        </FormItem>
      </form>
    </Form>
  );
}
