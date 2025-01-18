"use client";

import { useState, useRef, useCallback } from "react";
import { type Image } from "@prisma/client";
import { type RouterOutputs } from "@/trpc/react";
import {
  profileFormSchema,
  type ProfileFormData,
  type EditorJsData,
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
import { ImageManager } from "@/components/image-manager";
import { ImageUpload } from "@/components/image-upload";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/trpc/react";
import { useZodForm } from "@/hooks/use-zod-form";
import { Editor } from "@/components/editor";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type UserProfile = RouterOutputs["userProfile"]["get"];

interface ProfileFormProps {
  initialProfile: UserProfile;
}

// Convert plain text to EditorJS format
function convertToEditorData(value: string | null | undefined): EditorJsData {
  if (!value) {
    return {
      time: Date.now(),
      blocks: [],
      version: "2.28.2",
    };
  }

  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(value);
    if (parsed.blocks && Array.isArray(parsed.blocks)) {
      return parsed;
    }
  } catch {
    // If parsing fails, treat as plain text
    return {
      time: Date.now(),
      blocks: [
        {
          id: "legacy",
          type: "paragraph",
          data: {
            text: value,
          },
        },
      ],
      version: "2.28.2",
    };
  }

  // Fallback to empty editor
  return {
    time: Date.now(),
    blocks: [],
    version: "2.28.2",
  };
}

export function ProfileForm({ initialProfile }: ProfileFormProps) {
  const { toast } = useToast();
  const [profile, setProfile] = useState(initialProfile);
  const [images, setImages] = useState(initialProfile.images);
  const [isPending, setIsPending] = useState(false);
  const editorRef = useRef<{ save: () => Promise<EditorJsData | null> }>(null);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

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

  const form = useZodForm({
    schema: profileFormSchema,
    defaultValues: {
      intro: profile.intro ?? undefined,
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

  // Handle bio save
  const onBioSave = useCallback(async () => {
    if (!editorRef.current) return;
    setIsSaving(true);
    try {
      const data = await editorRef.current.save();
      if (data) {
        const updatedProfile = await updateProfileMutation.mutateAsync({
          data: {
            bio: JSON.stringify(data),
          },
        });
        setProfile(updatedProfile);
        toast({
          title: "Bio saved successfully",
        });
      }
    } catch (error) {
      console.error("Error saving bio:", error);
      toast({
        title: "Failed to save bio",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [updateProfileMutation, toast]);

  return (
    <Form {...form}>
      <div className="space-y-8">
        <div className="space-y-8">
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
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel>Bio</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBioSave}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Bio
            </Button>
          </div>
          <Editor
            ref={editorRef}
            defaultValue={convertToEditorData(profile.bio)}
            placeholder="Tell visitors about yourself and your garden..."
          />
          <FormDescription>
            Tell visitors about yourself and your garden.
          </FormDescription>
        </div>

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
      </div>
    </Form>
  );
}
