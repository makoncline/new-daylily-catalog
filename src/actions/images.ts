"use server";

import { api } from "@/trpc/server";
import { auth } from "@clerk/nextjs/server";
import { type ImageUploadResponse } from "@/types/image";

export async function getPresignedUrl(data: {
  type: "listing" | "profile";
  fileName: string;
  contentType: string;
  size: number;
  listingId?: string;
  userProfileId?: string;
}) {
  try {
    const session = auth();
    if (!session.userId) throw new Error("Not authenticated");

    // Validate content type
    const allowedContentTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedContentTypes.includes(data.contentType)) {
      throw new Error(
        "Invalid image type. Only JPEG and PNG files are allowed.",
      );
    }

    return await api.image.getPresignedUrl(data);
  } catch (err) {
    console.error("Failed to get presigned URL:", err);
    const message =
      err instanceof Error ? err.message : "Failed to get presigned URL";
    throw new Error(message);
  }
}

export async function uploadImage(
  formData: FormData,
): Promise<ImageUploadResponse> {
  try {
    const session = auth();
    if (!session.userId) throw new Error("Not authenticated");

    const key = formData.get("key");
    const type = formData.get("type");
    const listingId = formData.get("listingId");
    const userProfileId = formData.get("userProfileId");

    if (!key || !type || typeof key !== "string" || typeof type !== "string") {
      throw new Error("Invalid form data");
    }

    const result = await api.image.uploadImage({
      key,
      type: type as "listing" | "profile",
      listingId: listingId?.toString(),
      userProfileId: userProfileId?.toString(),
    });

    return {
      success: true,
      url: result.url,
      error: undefined,
    };
  } catch (err) {
    console.error("Failed to upload image:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to upload image",
      url: "",
    };
  }
}

export async function reorderImages(data: {
  type: "listing" | "profile";
  images: { id: string; order: number }[];
}) {
  try {
    const session = auth();
    if (!session.userId) throw new Error("Not authenticated");

    const result = await api.image.reorderImages(data);
    return result;
  } catch (err) {
    console.error("Failed to reorder images:", err);
    const message =
      err instanceof Error ? err.message : "Failed to reorder images";
    throw new Error(message);
  }
}

export async function deleteImage(data: {
  type: "listing" | "profile";
  imageId: string;
}) {
  try {
    const session = auth();
    if (!session.userId) throw new Error("Not authenticated");

    const result = await api.image.deleteImage(data);
    return result;
  } catch (err) {
    console.error("Failed to delete image:", err);
    const message =
      err instanceof Error ? err.message : "Failed to delete image";
    throw new Error(message);
  }
}
