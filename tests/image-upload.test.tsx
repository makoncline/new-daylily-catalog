import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const uploadMock = vi.hoisted(() => vi.fn());
const imageUploadState = vi.hoisted(() => ({
  isUploading: false,
  progress: 0,
  onSuccess: undefined as
    | ((
        result: {
          image: { id: string; url: string } | null;
          url: string;
          key?: string;
          presignedUrl?: string;
        },
      ) => void)
    | undefined,
}));
const dropzoneState = vi.hoisted(() => ({
  onDrop: undefined as ((files: File[]) => void) | undefined,
}));

vi.mock("@/hooks/use-image-upload", () => ({
  useImageUpload: (options: {
    onSuccess?: (result: {
      image: { id: string; url: string } | null;
      url: string;
      key?: string;
      presignedUrl?: string;
    }) => void;
  }) => {
    imageUploadState.onSuccess = options.onSuccess;
    return {
      upload: uploadMock,
      progress: imageUploadState.progress,
      isUploading: imageUploadState.isUploading,
    };
  },
}));

vi.mock("react-dropzone", () => ({
  useDropzone: ({ onDrop }: { onDrop: (files: File[]) => void }) => ({
    ...(() => {
      dropzoneState.onDrop = onDrop;
      return {};
    })(),
    getRootProps: () => ({}),
    getInputProps: () => ({
      onChange: (event: { target: { files?: FileList | File[] } }) =>
        onDrop(Array.from(event.target.files ?? [])),
    }),
    isDragActive: false,
  }),
}));

vi.mock("@/components/image-cropper", () => ({
  ImageCropper: ({
    onCropComplete,
    onCancel,
    isDisabled,
  }: {
    onCropComplete: (blob: Blob) => void;
    onCancel: () => void;
    isDisabled?: boolean;
  }) => (
    <div data-testid="image-cropper">
      <button
        type="button"
        onClick={() => onCropComplete(new Blob(["cropped"], { type: "image/jpeg" }))}
        disabled={isDisabled}
      >
        complete crop
      </button>
      <button type="button" onClick={onCancel} disabled={isDisabled}>
        cancel crop
      </button>
    </div>
  ),
}));

import { ImageUpload } from "@/components/image-upload";

function selectImageFile(fileName = "flower.jpg") {
  const file = new File(["binary"], fileName, { type: "image/jpeg" });
  if (!dropzoneState.onDrop) {
    throw new Error("Drop handler is not initialized");
  }
  act(() => {
    dropzoneState.onDrop?.([file]);
  });
}

describe("ImageUpload", () => {
  beforeAll(() => {
    class MockFileReader {
      result: string | ArrayBuffer | null = null;
      onloadend: (() => void) | null = null;

      readAsDataURL() {
        this.result = "data:image/jpeg;base64,mock";
        this.onloadend?.();
      }
    }

    vi.stubGlobal("FileReader", MockFileReader);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    imageUploadState.isUploading = false;
    imageUploadState.progress = 0;
    imageUploadState.onSuccess = undefined;
    dropzoneState.onDrop = undefined;
  });

  it("shows cropper after selecting a file", async () => {
    render(<ImageUpload type="listing" referenceId="listing-1" />);
    selectImageFile();

    await waitFor(() => {
      expect(screen.getByTestId("image-cropper")).toBeInTheDocument();
    });
  });

  it("uploads cropped image, clears cropper, and emits onUploadComplete", async () => {
    uploadMock.mockImplementation(async () => {
      imageUploadState.onSuccess?.({
        image: {
          id: "img-1",
          url: "https://example.com/images/img-1.jpg",
        },
        url: "https://example.com/images/img-1.jpg",
        key: "img-1.jpg",
        presignedUrl: "https://example.com/presigned",
      });
      return {
        image: {
          id: "img-1",
          url: "https://example.com/images/img-1.jpg",
        },
        url: "https://example.com/images/img-1.jpg",
        key: "img-1.jpg",
        presignedUrl: "https://example.com/presigned",
      };
    });

    const onUploadComplete = vi.fn();
    render(
      <ImageUpload
        type="listing"
        referenceId="listing-1"
        onUploadComplete={onUploadComplete}
      />,
    );
    selectImageFile();
    await waitFor(() => {
      expect(screen.getByTestId("image-cropper")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "complete crop" }));

    await waitFor(() => {
      expect(uploadMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByTestId("image-cropper")).not.toBeInTheDocument();
    });

    expect(onUploadComplete).toHaveBeenCalledWith({
      success: true,
      url: "https://example.com/images/img-1.jpg",
      key: "img-1.jpg",
      image: {
        id: "img-1",
        url: "https://example.com/images/img-1.jpg",
      },
    });
  });

  it("returns to dropzone UI when crop is cancelled", async () => {
    render(<ImageUpload type="listing" referenceId="listing-1" />);
    selectImageFile();
    await waitFor(() => {
      expect(screen.getByTestId("image-cropper")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "cancel crop" }));

    await waitFor(() => {
      expect(screen.queryByTestId("image-cropper")).not.toBeInTheDocument();
    });

    expect(
      screen.getByText("Drag and drop an image here, or click to select one"),
    ).toBeInTheDocument();
  });

  it("shows upload progress overlay while uploading", async () => {
    imageUploadState.isUploading = true;
    imageUploadState.progress = 42;

    render(<ImageUpload type="listing" referenceId="listing-1" />);
    selectImageFile();

    await waitFor(() => {
      expect(screen.getByText("Uploading image... 42%")).toBeInTheDocument();
    });
  });
});
