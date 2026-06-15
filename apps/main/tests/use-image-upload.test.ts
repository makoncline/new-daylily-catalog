import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getPresignedUrlMutateAsyncMock = vi.hoisted(() => vi.fn());
const createImageMock = vi.hoisted(() => vi.fn());
const uploadFileWithProgressMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const reportErrorMock = vi.hoisted(() => vi.fn());
const getErrorMessageMock = vi.hoisted(() =>
  vi.fn((error: unknown) =>
    error instanceof Error ? error.message : String(error ?? "Unknown error"),
  ),
);

vi.mock("@/trpc/react", () => ({
  api: {
    dashboardDb: {
      image: {
        getPresignedUrl: {
          useMutation: () => ({
            mutateAsync: getPresignedUrlMutateAsyncMock,
          }),
        },
      },
    },
  },
}));

vi.mock("@/app/dashboard/_lib/dashboard-db/images-collection", () => ({
  createImage: createImageMock,
}));

vi.mock("@/lib/utils", () => ({
  uploadFileWithProgress: uploadFileWithProgressMock,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

vi.mock("@/lib/error-utils", () => ({
  getErrorMessage: getErrorMessageMock,
  normalizeError: (error: unknown) => error,
  reportError: reportErrorMock,
}));

import { useImageUpload } from "@/hooks/use-image-upload";

describe("useImageUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads successfully and resets state", async () => {
    const uploadedImage = {
      id: "img-1",
      url: "https://example.com/images/img-1.jpg",
    };

    getPresignedUrlMutateAsyncMock.mockResolvedValue({
      imageId: "img-1",
      presignedUrl: "https://upload-url.example",
      key: "abc123.jpg",
      url: uploadedImage.url,
      r2: {
        presignedUrl: "https://r2-upload-url.example",
        key: "users/user-1/listing-images/listing-1/img-1/original.jpg",
        url: "https://media.daylilycatalog.com/users/user-1/listing-images/listing-1/img-1/original.jpg",
      },
    });
    uploadFileWithProgressMock.mockImplementation(
      async ({ onProgress }: { onProgress: (value: number) => void }) => {
        onProgress(25);
        onProgress(100);
      },
    );
    createImageMock.mockResolvedValue(uploadedImage);

    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useImageUpload({
        type: "listing",
        referenceId: "listing-1",
        onSuccess,
      }),
    );

    const file = new Blob(["image-bytes"], { type: "image/jpeg" });

    let returned: unknown;
    await act(async () => {
      returned = await result.current.upload(file);
    });

    expect(getPresignedUrlMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "listing",
        contentType: "image/jpeg",
        size: file.size,
        referenceId: "listing-1",
      }),
    );
    expect(uploadFileWithProgressMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        presignedUrl: "https://r2-upload-url.example",
        file,
        onProgress: expect.any(Function),
      }),
    );
    expect(uploadFileWithProgressMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        presignedUrl: "https://upload-url.example",
        file,
        onProgress: expect.any(Function),
      }),
    );
    expect(createImageMock).toHaveBeenCalledWith({
      type: "listing",
      referenceId: "listing-1",
      url: uploadedImage.url,
      key: "abc123.jpg",
      imageId: "img-1",
      r2OriginalKey: "users/user-1/listing-images/listing-1/img-1/original.jpg",
    });
    expect(onSuccess).toHaveBeenCalledWith(uploadedImage);
    expect(toastSuccessMock).toHaveBeenCalledWith(
      "Image uploaded successfully",
    );
    expect(returned).toEqual(uploadedImage);

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
      expect(result.current.progress).toBe(0);
    });
  });

  it("continues with legacy upload when R2 upload fails", async () => {
    const uploadedImage = {
      id: "img-1",
      url: "https://example.com/images/img-1.jpg",
    };

    getPresignedUrlMutateAsyncMock.mockResolvedValue({
      imageId: "img-1",
      presignedUrl: "https://upload-url.example",
      key: "abc123.jpg",
      url: uploadedImage.url,
      r2: {
        presignedUrl: "https://r2-upload-url.example",
        key: "users/user-1/listing-images/listing-1/img-1/original.jpg",
        url: "https://media.daylilycatalog.com/users/user-1/listing-images/listing-1/img-1/original.jpg",
      },
    });
    uploadFileWithProgressMock
      .mockRejectedValueOnce(new Error("R2 unavailable"))
      .mockResolvedValueOnce(undefined);
    createImageMock.mockResolvedValue(uploadedImage);

    const { result } = renderHook(() =>
      useImageUpload({
        type: "listing",
        referenceId: "listing-1",
      }),
    );

    const file = new Blob(["image-bytes"], { type: "image/jpeg" });

    let returned: unknown;
    await act(async () => {
      returned = await result.current.upload(file);
    });

    expect(uploadFileWithProgressMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        presignedUrl: "https://r2-upload-url.example",
      }),
    );
    expect(uploadFileWithProgressMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        presignedUrl: "https://upload-url.example",
      }),
    );
    expect(createImageMock).toHaveBeenCalledWith({
      type: "listing",
      referenceId: "listing-1",
      url: uploadedImage.url,
      key: "abc123.jpg",
    });
    expect(reportErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "warning",
        context: expect.objectContaining({
          source: "useImageUpload",
          step: "r2-upload",
        }),
      }),
    );
    expect(toastErrorMock).not.toHaveBeenCalled();
    expect(returned).toEqual(uploadedImage);
  });

  it("uses a supported signed content type for untyped blobs", async () => {
    const uploadedImage = {
      id: "img-1",
      url: "https://example.com/images/img-1.jpg",
    };

    getPresignedUrlMutateAsyncMock.mockResolvedValue({
      imageId: "img-1",
      presignedUrl: "https://upload-url.example",
      key: "abc123.jpg",
      url: uploadedImage.url,
      r2: null,
    });
    uploadFileWithProgressMock.mockResolvedValue(undefined);
    createImageMock.mockResolvedValue(uploadedImage);

    const { result } = renderHook(() =>
      useImageUpload({
        type: "listing",
        referenceId: "listing-1",
      }),
    );

    const file = new Blob(["image-bytes"]);

    await act(async () => {
      await result.current.upload(file);
    });

    expect(getPresignedUrlMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "image/jpeg",
      }),
    );
    expect(uploadFileWithProgressMock).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "image/jpeg",
      }),
    );
  });

  it("presigns WebP uploads with a WebP filename", async () => {
    const uploadedImage = {
      id: "img-1",
      url: "https://example.com/images/img-1.webp",
    };

    getPresignedUrlMutateAsyncMock.mockResolvedValue({
      imageId: "img-1",
      presignedUrl: "https://upload-url.example",
      key: "abc123.webp",
      url: uploadedImage.url,
      r2: null,
    });
    uploadFileWithProgressMock.mockResolvedValue(undefined);
    createImageMock.mockResolvedValue(uploadedImage);

    const { result } = renderHook(() =>
      useImageUpload({
        type: "listing",
        referenceId: "listing-1",
      }),
    );

    const file = new Blob(["image-bytes"], { type: "image/webp" });

    await act(async () => {
      await result.current.upload(file);
    });

    expect(getPresignedUrlMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "image/webp",
      }),
    );
    expect(uploadFileWithProgressMock).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "image/webp",
      }),
    );
  });

  it("rejects unsupported typed blobs before presigning", async () => {
    const { result } = renderHook(() =>
      useImageUpload({
        type: "listing",
        referenceId: "listing-1",
      }),
    );

    const file = new Blob(["image-bytes"], { type: "image/gif" });

    let returned: unknown;
    await act(async () => {
      returned = await result.current.upload(file);
    });

    expect(returned).toBeUndefined();
    expect(getPresignedUrlMutateAsyncMock).not.toHaveBeenCalled();
    expect(uploadFileWithProgressMock).not.toHaveBeenCalled();
    expect(createImageMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith("Failed to get upload URL", {
      description: "Only JPEG, PNG, and WebP images are supported",
    });
  });

  it("handles presigned-url failure and resets state", async () => {
    getPresignedUrlMutateAsyncMock.mockRejectedValue(
      new Error("Presign failed"),
    );

    const { result } = renderHook(() =>
      useImageUpload({
        type: "listing",
        referenceId: "listing-1",
      }),
    );

    const file = new Blob(["image-bytes"], { type: "image/jpeg" });

    let returned: unknown;
    await act(async () => {
      returned = await result.current.upload(file);
    });

    expect(uploadFileWithProgressMock).not.toHaveBeenCalled();
    expect(createImageMock).not.toHaveBeenCalled();
    expect(returned).toBeUndefined();
    expect(toastErrorMock).toHaveBeenCalledWith("Failed to get upload URL", {
      description: "Presign failed",
    });

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
      expect(result.current.progress).toBe(0);
    });
  });

  it("handles upload failure and resets state", async () => {
    getPresignedUrlMutateAsyncMock.mockResolvedValue({
      imageId: "img-1",
      presignedUrl: "https://upload-url.example",
      key: "abc123.jpg",
      url: "https://example.com/images/img-1.jpg",
      r2: null,
    });
    uploadFileWithProgressMock.mockRejectedValue(new Error("Upload failed"));

    const { result } = renderHook(() =>
      useImageUpload({
        type: "listing",
        referenceId: "listing-1",
      }),
    );

    const file = new Blob(["image-bytes"], { type: "image/jpeg" });

    let returned: unknown;
    await act(async () => {
      returned = await result.current.upload(file);
    });

    expect(createImageMock).not.toHaveBeenCalled();
    expect(returned).toBeUndefined();
    expect(toastErrorMock).toHaveBeenCalledWith("Failed to upload image", {
      description: "Upload failed",
    });

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
      expect(result.current.progress).toBe(0);
    });
  });

  it("handles create-image failure and resets state", async () => {
    getPresignedUrlMutateAsyncMock.mockResolvedValue({
      imageId: "img-1",
      presignedUrl: "https://upload-url.example",
      key: "abc123.jpg",
      url: "https://example.com/images/img-1.jpg",
      r2: null,
    });
    uploadFileWithProgressMock.mockResolvedValue(undefined);
    createImageMock.mockRejectedValue(new Error("Create failed"));

    const { result } = renderHook(() =>
      useImageUpload({
        type: "listing",
        referenceId: "listing-1",
      }),
    );

    const file = new Blob(["image-bytes"], { type: "image/jpeg" });

    let returned: unknown;
    await act(async () => {
      returned = await result.current.upload(file);
    });

    expect(createImageMock).toHaveBeenCalledWith({
      type: "listing",
      referenceId: "listing-1",
      url: "https://example.com/images/img-1.jpg",
      key: "abc123.jpg",
    });
    expect(returned).toBeUndefined();
    expect(toastErrorMock).toHaveBeenCalledWith("Failed to save image", {
      description: "Create failed",
    });

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
      expect(result.current.progress).toBe(0);
    });
  });
});
