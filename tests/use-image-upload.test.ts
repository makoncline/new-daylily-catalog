import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getPresignedUrlMutateAsyncMock = vi.hoisted(() => vi.fn());
const createImageMutateAsyncMock = vi.hoisted(() => vi.fn());
const uploadFileWithProgressMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const getErrorMessageMock = vi.hoisted(() =>
  vi.fn((error: unknown) =>
    error instanceof Error ? error.message : String(error ?? "Unknown error"),
  ),
);

vi.mock("@/trpc/react", () => ({
  api: {
    image: {
      getPresignedUrl: {
        useMutation: () => ({
          mutateAsync: getPresignedUrlMutateAsyncMock,
        }),
      },
      createImage: {
        useMutation: () => ({
          mutateAsync: createImageMutateAsyncMock,
        }),
      },
    },
  },
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
}));

import { useImageUpload } from "@/hooks/use-image-upload";

describe("useImageUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("reportError", vi.fn());
  });

  it("uploads successfully and resets state", async () => {
    const uploadedImage = {
      id: "img-1",
      url: "https://example.com/images/img-1.jpg",
    };

    getPresignedUrlMutateAsyncMock.mockResolvedValue({
      presignedUrl: "https://upload-url.example",
      key: "abc123.jpg",
      url: uploadedImage.url,
    });
    uploadFileWithProgressMock.mockImplementation(
      async ({
        onProgress,
      }: {
        onProgress: (value: number) => void;
      }) => {
        onProgress(25);
        onProgress(100);
      },
    );
    createImageMutateAsyncMock.mockResolvedValue(uploadedImage);

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
    expect(uploadFileWithProgressMock).toHaveBeenCalledWith(
      expect.objectContaining({
        presignedUrl: "https://upload-url.example",
        file,
        onProgress: expect.any(Function),
      }),
    );
    expect(createImageMutateAsyncMock).toHaveBeenCalledWith({
      type: "listing",
      referenceId: "listing-1",
      url: uploadedImage.url,
      key: "abc123.jpg",
    });
    expect(onSuccess).toHaveBeenCalledWith(uploadedImage);
    expect(toastSuccessMock).toHaveBeenCalledWith("Image uploaded successfully");
    expect(returned).toEqual(uploadedImage);

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
      expect(result.current.progress).toBe(0);
    });
  });

  it("handles presigned-url failure and resets state", async () => {
    getPresignedUrlMutateAsyncMock.mockRejectedValue(new Error("Presign failed"));

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
    expect(createImageMutateAsyncMock).not.toHaveBeenCalled();
    expect(returned).toBeUndefined();
    expect(toastErrorMock).toHaveBeenCalledWith("Failed to upload image", {
      description: "Presign failed",
    });

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
      expect(result.current.progress).toBe(0);
    });
  });

  it("handles upload failure and resets state", async () => {
    getPresignedUrlMutateAsyncMock.mockResolvedValue({
      presignedUrl: "https://upload-url.example",
      key: "abc123.jpg",
      url: "https://example.com/images/img-1.jpg",
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

    expect(createImageMutateAsyncMock).not.toHaveBeenCalled();
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
      presignedUrl: "https://upload-url.example",
      key: "abc123.jpg",
      url: "https://example.com/images/img-1.jpg",
    });
    uploadFileWithProgressMock.mockResolvedValue(undefined);
    createImageMutateAsyncMock.mockRejectedValue(new Error("Create failed"));

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

    expect(returned).toBeUndefined();
    expect(toastErrorMock).toHaveBeenCalledWith("Failed to upload image", {
      description: "Create failed",
    });

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
      expect(result.current.progress).toBe(0);
    });
  });
});
