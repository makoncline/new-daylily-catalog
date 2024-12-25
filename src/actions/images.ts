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
  } catch (error) {
    console.error("Failed to get presigned URL:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to get presigned URL",
    );
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

    return await api.image.uploadImage({
      key,
      type: type as "listing" | "profile",
      listingId: listingId?.toString(),
      userProfileId: userProfileId?.toString(),
    });
  } catch (error) {
    console.error("Failed to upload image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload image",
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

    return await api.image.reorderImages(data);
  } catch (error) {
    console.error("Failed to reorder images:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to reorder images",
    );
  }
}

export async function deleteImage(data: {
  type: "listing" | "profile";
  imageId: string;
}) {
  try {
    const session = auth();
    if (!session.userId) throw new Error("Not authenticated");

    return await api.image.deleteImage(data);
  } catch (error) {
    console.error("Failed to delete image:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to delete image",
    );
  }
}
