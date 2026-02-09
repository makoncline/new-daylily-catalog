import { QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import type { Image } from "@prisma/client";
import type { ImageUploadResponse } from "@/types/image";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { userEvent } from "@vitest/browser/context";
import { HttpResponse, http } from "msw";
import { useState } from "react";
import SuperJSON from "superjson";
import { afterEach, beforeEach, expect, vi } from "vitest";
import { test } from "../test-extend";

let reportErrorMock: ReturnType<typeof vi.fn>;

const SLOW_MOTION_MS = Number(process.env.VITE_TEST_SLOW_MS ?? 0);
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6p5nQAAAAASUVORK5CYII=";
const TINY_PNG_BYTES = Uint8Array.from(atob(TINY_PNG_BASE64), (char) =>
  char.charCodeAt(0),
);

function getImageStorageKeyFromUrl(urlString: string): string | undefined {
  const url = new URL(urlString);

  const cloudflarePath = url.pathname.match(/^\/cdn-cgi\/image\/[^/]+\/(.+)$/);
  if (cloudflarePath?.[1]) {
    const decodedSourceUrl = decodeURI(cloudflarePath[1]);
    const sourceUrl = new URL(decodedSourceUrl);
    return sourceUrl.pathname.replace(/^\/+/, "");
  }

  const directPath = url.pathname.replace(/^\/+/, "");
  return directPath.length > 0 ? directPath : undefined;
}

vi.mock("@sentry/nextjs", () => ({
  captureException: () => "mock-event-id",
  captureMessage: () => "mock-event-id",
}));

async function pause() {
  if (SLOW_MOTION_MS <= 0) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, SLOW_MOTION_MS));
}

async function createPngFile({
  fileName,
  color,
}: {
  fileName: string;
  color: string;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 400;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas context unavailable");
  }

  context.fillStyle = color;
  context.fillRect(0, 0, 400, 400);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error("Failed to create PNG blob"));
        return;
      }

      resolve(result);
    }, "image/png");
  });

  return new File([blob], fileName, { type: "image/png" });
}

async function renderImageUploadManagerHarness() {
  const [{ ImageManager }, { ImageUpload }, { createQueryClient }, { api }] =
    await Promise.all([
      import("@/components/image-manager"),
      import("@/components/image-upload"),
      import("@/trpc/query-client"),
      import("@/trpc/react"),
    ]);

  function TestTrpcProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => createQueryClient());
    const [trpcClient] = useState(() =>
      api.createClient({
        links: [
          httpBatchLink({
            transformer: SuperJSON,
            url: `${window.location.origin}/api/trpc`,
            headers: () => {
              const headers = new Headers();
              headers.set("x-trpc-source", "vitest-browser");
              return headers;
            },
          }),
        ],
      }),
    );

    return (
      <QueryClientProvider client={queryClient}>
        <api.Provider client={trpcClient} queryClient={queryClient}>
          {children}
        </api.Provider>
      </QueryClientProvider>
    );
  }

  function ImageUploadManagerHarness() {
    const [images, setImages] = useState<Image[]>([]);

    const handleUploadComplete = (result: ImageUploadResponse) => {
      if (!result.success) {
        return;
      }

      setImages((prev) => [...prev, result.image]);
    };

    return (
      <div>
        <ImageManager
          images={images}
          onImagesChange={setImages}
          referenceId="listing-1"
          type="listing"
        />

        <ImageUpload
          type="listing"
          referenceId="listing-1"
          onUploadComplete={handleUploadComplete}
        />
      </div>
    );
  }

  render(
    <TestTrpcProvider>
      <ImageUploadManagerHarness />
    </TestTrpcProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  reportErrorMock = vi.fn();
  vi.stubGlobal("reportError", reportErrorMock);
});

afterEach(() => {
  cleanup();
});

test("uploads, crops/saves, previews, reorders, and deletes images with network-level mocks", async ({
  worker,
}) => {
  const callCounts = {
    getPresignedUrl: 0,
    s3Upload: 0,
    createImage: 0,
    reorderImages: 0,
    deleteImage: 0,
  };

  const createdImageIds: string[] = [];
  let lastReorderInput: Record<string, unknown> | undefined;
  let lastDeleteInput: Record<string, unknown> | undefined;
  const uploadedImageBytesByKey = new Map<
    string,
    { bytes: Uint8Array; contentType: string }
  >();

  worker.use(
    http.post("/api/trpc/:procedure", async ({ params, request }) => {
      const procedure = String(params.procedure);
      const payload = (await request.json()) as Record<string, unknown>;
      const input =
        ((payload["0"] as { json?: Record<string, unknown> } | undefined)
          ?.json as Record<string, unknown> | undefined) ??
        (payload as Record<string, unknown>);

      if (procedure.includes("image.getPresignedUrl")) {
        callCounts.getPresignedUrl += 1;

        const sequence = callCounts.getPresignedUrl;
        return HttpResponse.json([
          {
            result: {
              data: {
                json: {
                  presignedUrl: `https://s3-upload.test/listing-1/mock-key-${sequence}.jpg`,
                  key: `listing-1/mock-key-${sequence}.jpg`,
                  url: `https://cdn.test/listing-1/mock-key-${sequence}.jpg`,
                },
              },
            },
          },
        ]);
      }

      if (procedure.includes("image.createImage")) {
        callCounts.createImage += 1;

        const imageId = `img-${callCounts.createImage}`;
        createdImageIds.push(imageId);

        return HttpResponse.json([
          {
            result: {
              data: {
                json: {
                  id: imageId,
                  url: input?.url,
                  order: callCounts.createImage - 1,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  status: null,
                  userProfileId: null,
                  listingId: "listing-1",
                },
              },
            },
          },
        ]);
      }

      if (procedure.includes("image.reorderImages")) {
        callCounts.reorderImages += 1;
        lastReorderInput = input;

        return HttpResponse.json([
          {
            result: {
              data: {
                json: { success: true },
              },
            },
          },
        ]);
      }

      if (procedure.includes("image.deleteImage")) {
        callCounts.deleteImage += 1;
        lastDeleteInput = input;

        return HttpResponse.json([
          {
            result: {
              data: {
                json: { success: true },
              },
            },
          },
        ]);
      }

      return HttpResponse.json(
        [
          {
            error: {
              code: -32601,
              message: `Unhandled test procedure: ${procedure}`,
              data: {
                code: "NOT_FOUND",
                httpStatus: 404,
                path: procedure,
              },
            },
          },
        ],
        { status: 404 },
      );
    }),
    http.put("https://s3-upload.test/:path*", async ({ request }) => {
      callCounts.s3Upload += 1;
      expect(request.headers.get("content-type")).toBe("image/jpeg");

      const storageKey = getImageStorageKeyFromUrl(request.url);
      if (storageKey) {
        const bytes = new Uint8Array(await request.arrayBuffer());
        uploadedImageBytesByKey.set(storageKey, {
          bytes,
          contentType: request.headers.get("content-type") ?? "image/jpeg",
        });
      }

      return new HttpResponse(null, { status: 200 });
    }),
    http.get("https://cdn.test/:path*", ({ request }) => {
      const storageKey = getImageStorageKeyFromUrl(request.url);
      const uploadedImage = storageKey
        ? uploadedImageBytesByKey.get(storageKey)
        : undefined;

      return new HttpResponse(uploadedImage?.bytes ?? TINY_PNG_BYTES, {
        headers: {
          "content-type": uploadedImage?.contentType ?? "image/png",
        },
      });
    }),
  );

  await renderImageUploadManagerHarness();

  const getUploadInput = () =>
    document.getElementById("image-upload-input") as HTMLInputElement | null;

  expect(getUploadInput()).toBeTruthy();

  const getImageOrder = () =>
    screen
      .getAllByTestId("image-item")
      .map((item) => item.getAttribute("data-image-id"))
      .filter((id): id is string => Boolean(id));

  const waitForManagedImagesToSettle = async (expectedCount: number) => {
    await waitFor(() => {
      const items = screen.getAllByTestId("image-item");
      expect(items).toHaveLength(expectedCount);

      for (const item of items) {
        const img = item.querySelector("img") as HTMLImageElement | null;
        expect(img).toBeTruthy();
        expect(img?.complete).toBe(true);
      }
    }, { timeout: 10_000 });
  };

  const uploadOneImage = async (file: File, expectedImageCount: number) => {
    const input = getUploadInput();
    expect(input).toBeTruthy();

    await pause();
    fireEvent.change(input!, {
      target: {
        files: [file],
      },
    });

    const uploadButton = await screen.findByRole("button", { name: "Upload" });
    await waitFor(() => {
      expect(uploadButton).toBeEnabled();
    }, { timeout: 10_000 });

    await pause();
    await userEvent.click(uploadButton);

    await waitFor(() => {
      expect(reportErrorMock).not.toHaveBeenCalled();
    }, { timeout: 10_000 });

    await waitFor(() => {
      expect(callCounts.createImage).toBe(expectedImageCount);
    }, { timeout: 10_000 });

    await waitForManagedImagesToSettle(expectedImageCount);

    await pause();
  };

  await uploadOneImage(
    await createPngFile({ fileName: "flower-red.png", color: "#ff4d4f" }),
    1,
  );
  await uploadOneImage(
    await createPngFile({ fileName: "flower-blue.png", color: "#4f7cff" }),
    2,
  );

  await waitForManagedImagesToSettle(2);

  await pause();
  await userEvent.click(screen.getAllByRole("button", { name: /view 1 image/i })[0]!);
  expect(await screen.findByRole("dialog")).toBeInTheDocument();

  await pause();
  await userEvent.keyboard("{Escape}");
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  const initialOrder = getImageOrder();
  const firstId = initialOrder[0];
  const secondId = initialOrder[1];

  if (!firstId || !secondId) {
    throw new Error("Expected at least two images to reorder");
  }

  await pause();
  const firstHandle = document.querySelector(
    `[data-testid="image-drag-handle"][data-image-id="${firstId}"]`,
  ) as HTMLElement | null;
  expect(firstHandle).toBeTruthy();
  await userEvent.click(firstHandle!);

  let reorderTriggered = false;
  const directions = ["{ArrowRight}", "{ArrowDown}", "{ArrowLeft}", "{ArrowUp}"];
  for (const direction of directions) {
    const reorderCallsBefore = callCounts.reorderImages;

    await userEvent.keyboard("{Space}");
    await userEvent.keyboard(direction);
    await userEvent.keyboard("{Space}");

    try {
      await waitFor(() => {
        expect(callCounts.reorderImages).toBeGreaterThan(reorderCallsBefore);
      }, { timeout: 1_500 });
      reorderTriggered = true;
      break;
    } catch {
      await userEvent.keyboard("{Escape}");
    }
  }

  expect(reorderTriggered).toBe(true);

  const reordered = getImageOrder();
  expect(reordered).not.toEqual(initialOrder);

  await pause();
  const deleteButton = screen.getAllByTestId("image-delete-button")[0] as HTMLButtonElement;
  await userEvent.click(deleteButton);
  const confirmDeleteButton = await screen.findByRole("button", {
    name: /^Delete$/,
  });
  expect(confirmDeleteButton).toBeInTheDocument();

  await pause();
  await userEvent.click(confirmDeleteButton);

  await waitForManagedImagesToSettle(1);

  expect(callCounts.getPresignedUrl).toBe(2);
  expect(callCounts.s3Upload).toBe(2);
  expect(callCounts.createImage).toBe(2);
  expect(callCounts.reorderImages).toBe(1);
  expect(callCounts.deleteImage).toBe(1);
  expect(createdImageIds).toEqual(["img-1", "img-2"]);
  expect(lastReorderInput?.type).toBe("listing");
  expect(lastReorderInput?.referenceId).toBe("listing-1");
  expect(lastDeleteInput?.type).toBe("listing");
  expect(lastDeleteInput?.referenceId).toBe("listing-1");
});
