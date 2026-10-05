import path from "node:path";
import { mkdirSync } from "node:fs";
import sharp from "sharp";
import { jsonlStreamProducer } from "@trpc/server/unstable-core-do-not-import";
import SuperJSON from "superjson";
import type { Page } from "@playwright/test";
import type { WebMcpTool } from "@/lib/webmcp";
import { expect, test } from "./fixtures";

test.use({ video: process.env.IMAGE_CROP_PROOF_DIR ? "on" : "off" });

interface CropState {
  image: { width: number; height: number };
  crop: { left: number; top: number; size: number };
  outputSize: number;
  minimumSize: number;
}

interface CropModelContext {
  getTools: () => Promise<WebMcpTool[]>;
  executeTool: (
    tool: WebMcpTool,
    input: Record<string, unknown>,
  ) => Promise<string>;
}

async function runCropTool(
  page: Page,
  name: string,
  input: Record<string, unknown> = {},
) {
  return page.evaluate(
    async ({ name, input }) => {
      const context = (
        document as Document & { modelContext: CropModelContext }
      ).modelContext;
      const tool = (await context.getTools()).find(
        (tool) => tool.name === name,
      );
      if (!tool) throw new Error(`Missing crop tool: ${name}`);
      const result = await context.executeTool(tool, input);
      return (JSON.parse(result) as { structuredContent: CropState })
        .structuredContent;
    },
    { name, input },
  );
}

async function cropToolNames(page: Page) {
  return page.evaluate(async () => {
    const context = (document as Document & { modelContext: CropModelContext })
      .modelContext;
    return (await context.getTools())
      .map((tool) => tool.name)
      .filter((name) => name.endsWith("-image-crop"));
  });
}

test("browser crop tools keep listing and profile UI free of coordinate fields", async ({
  page,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Integration baseURL is required.");
  await page.addInitScript(() => {
    const tools = new Map<string, WebMcpTool>();
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        async registerTool(tool: WebMcpTool, options: { signal: AbortSignal }) {
          if (options.signal.aborted) return;
          if (tools.has(tool.name))
            throw new Error(`Duplicate tool: ${tool.name}`);
          tools.set(tool.name, tool);
          options.signal.addEventListener(
            "abort",
            () => {
              if (tools.get(tool.name) === tool) tools.delete(tool.name);
            },
            { once: true },
          );
        },
        async getTools() {
          return Array.from(tools.values());
        },
        async executeTool(tool: WebMcpTool, input: Record<string, unknown>) {
          if (tools.get(tool.name) !== tool)
            throw new Error("Crop tool is unavailable.");
          return JSON.stringify(await tool.execute(input));
        },
      },
    });
  });
  const source = await sharp(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="2000"><rect width="1000" height="2000" fill="red"/><rect x="1000" width="2000" height="2000" fill="blue"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  const portraitSource = await sharp(source).rotate(90).png().toBuffer();
  let uploadedBytes: Buffer | null = null;
  const photoRequests: string[] = [];
  page.on("request", (request) => {
    if (decodeURIComponent(request.url()).includes("dashboardDb.image."))
      photoRequests.push(request.url());
  });
  await page.route(
    "**/api/trpc/dashboardDb.image.getPresignedUrl*",
    async (route) => {
      const stream = jsonlStreamProducer({
        data: [
          Promise.resolve({
            result: Promise.resolve({
              data: Promise.resolve({
                imageId: "crop-proof",
                key: "crop-proof.webp",
                url: `${baseURL}/__crop-proof/image.webp`,
                presignedUrl: `${baseURL}/__crop-proof/upload`,
              }),
            }),
          }),
        ],
        serialize: SuperJSON.serialize,
      });
      await route.fulfill({
        contentType: "application/json",
        body: await new Response(stream).text(),
      });
    },
  );
  await page.route("**/__crop-proof/upload", async (route) => {
    uploadedBytes = route.request().postDataBuffer();
    // Stop before storage or attachment. Only the browser's prepared file is tested.
    await route.fulfill({ status: 503, body: "Local crop proof complete" });
  });

  for (const type of ["listing", "profile"] as const) {
    const left = type === "listing" ? 1000 : 0;
    const top = type === "listing" ? 0 : 1000;
    uploadedBytes = null;
    photoRequests.length = 0;
    await page.setViewportSize(
      type === "listing"
        ? { width: 1280, height: 900 }
        : { width: 402, height: 874 },
    );
    await page.goto(
      type === "listing"
        ? "/dashboard/listings?editing=integration-media-listing#listing-images"
        : "/dashboard/profile#profile-images",
    );
    const fileInput = page.getByLabel(`Choose ${type} image`);
    await expect(fileInput).toBeAttached();
    await expect.poll(() => cropToolNames(page)).toEqual([]);
    await fileInput.setInputFiles({
      name: "crop-proof.png",
      mimeType: "image/png",
      buffer: type === "listing" ? source : portraitSource,
    });
    const preview = page.getByRole("img", { name: "Crop preview" });
    await expect(preview).toBeVisible();
    const cropper = page.getByRole("group", {
      name: "Image crop",
      exact: true,
    });
    await expect(cropper.getByRole("spinbutton")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Apply crop" })).toHaveCount(
      0,
    );
    await expect
      .poll(() => cropToolNames(page))
      .toEqual(["daylily.get-image-crop", "daylily.set-image-crop"]);
    await expect
      .poll(() =>
        preview.evaluate((image) => {
          const imageBounds = image.getBoundingClientRect();
          const cropBounds = image
            .closest(".ReactCrop")
            ?.getBoundingClientRect();
          return cropBounds
            ? Math.abs(imageBounds.width - cropBounds.width)
            : Infinity;
        }),
      )
      .toBeLessThan(1);
    const uploadButton = cropper.getByRole("button", {
      name: "Upload",
      exact: true,
    });
    await expect(uploadButton).toBeEnabled();
    const initial = await runCropTool(page, "daylily.get-image-crop");
    expect(initial.image).toEqual(
      type === "listing"
        ? { width: 3000, height: 2000 }
        : { width: 2000, height: 3000 },
    );
    await expect(
      runCropTool(page, "daylily.set-image-crop", { left, top, size: 2500 }),
    ).rejects.toThrow("stay inside the image");
    expect(await runCropTool(page, "daylily.get-image-crop")).toEqual(initial);
    const updated = await runCropTool(page, "daylily.set-image-crop", {
      left,
      top,
      size: 2000,
    });
    expect(updated.crop).toEqual({ left, top, size: 2000 });
    expect(updated.outputSize).toBe(1600);
    expect(uploadedBytes).toBeNull();
    expect(
      photoRequests.some((url) =>
        decodeURIComponent(url).includes("dashboardDb.image.getPresignedUrl"),
      ),
    ).toBe(false);
    await expect(uploadButton).toBeEnabled();
    await page.setViewportSize(
      type === "listing"
        ? { width: 960, height: 900 }
        : { width: 360, height: 874 },
    );
    expect((await runCropTool(page, "daylily.get-image-crop")).crop).toEqual({
      left,
      top,
      size: 2000,
    });
    await cropper
      .locator(".ReactCrop__crop-selection")
      .press(type === "listing" ? "ArrowLeft" : "ArrowUp");
    await expect
      .poll(async () => {
        const state = await runCropTool(page, "daylily.get-image-crop");
        return type === "listing" ? state.crop.left : state.crop.top;
      })
      .toBeLessThan(1000);
    await cropper.getByRole("button", { name: "Reset", exact: true }).click();
    await expect
      .poll(
        async () => (await runCropTool(page, "daylily.get-image-crop")).crop,
      )
      .toEqual(initial.crop);
    await runCropTool(page, "daylily.set-image-crop", {
      left,
      top,
      size: 2000,
    });
    if (process.env.IMAGE_CROP_PROOF_DIR) {
      mkdirSync(process.env.IMAGE_CROP_PROOF_DIR, { recursive: true });
      await cropper.screenshot({
        path: path.join(process.env.IMAGE_CROP_PROOF_DIR, `${type}-crop.png`),
      });
    }
    await uploadButton.click();
    await expect.poll(() => uploadedBytes?.byteLength ?? 0).toBeGreaterThan(0);
    const bytes = uploadedBytes;
    if (!bytes) throw new Error("Expected the browser's cropped upload.");
    if (process.env.IMAGE_CROP_PROOF_DIR) {
      await sharp(bytes).toFile(
        path.join(process.env.IMAGE_CROP_PROOF_DIR, `${type}-upload.webp`),
      );
    }
    expect(await sharp(bytes).metadata()).toMatchObject({
      format: "webp",
      width: 1600,
      height: 1600,
    });
    const pixel = await sharp(bytes)
      .extract({ left: 800, top: 800, width: 1, height: 1 })
      .removeAlpha()
      .raw()
      .toBuffer();
    expect(pixel[0]).toBeLessThan(10);
    expect(pixel[1]).toBeLessThan(10);
    expect(pixel[2]).toBeGreaterThan(240);
    await expect(
      page.getByText("Failed to upload image", { exact: true }),
    ).toBeVisible();
    expect(
      photoRequests.some((url) =>
        decodeURIComponent(url).includes("dashboardDb.image.create"),
      ),
    ).toBe(false);
    await cropper.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect.poll(() => cropToolNames(page)).toEqual([]);
    await expect(fileInput).toBeAttached();
  }
});

test("normal image crop controls work without browser MCP", async ({
  page,
}) => {
  const source = await sharp({
    create: { width: 600, height: 400, channels: 3, background: "blue" },
  })
    .png()
    .toBuffer();
  await page.goto(
    "/dashboard/listings?editing=integration-media-listing#listing-images",
  );
  const fileInput = page.getByLabel("Choose listing image");
  await fileInput.setInputFiles({
    name: "normal-crop.png",
    mimeType: "image/png",
    buffer: source,
  });
  const cropper = page.getByRole("group", { name: "Image crop", exact: true });
  const selection = cropper.locator(".ReactCrop__crop-selection");
  await expect(selection).toBeVisible();
  await expect(cropper.getByRole("spinbutton")).toHaveCount(0);
  const initial = await selection.boundingBox();
  if (!initial) throw new Error("Expected the visible crop selection.");
  await selection.press("ArrowLeft");
  await expect
    .poll(async () => (await selection.boundingBox())?.x)
    .toBeLessThan(initial.x);
  await cropper.getByRole("button", { name: "Reset", exact: true }).click();
  await expect
    .poll(async () => (await selection.boundingBox())?.x)
    .toBe(initial.x);
  await expect(
    cropper.getByRole("button", { name: "Upload", exact: true }),
  ).toBeEnabled();
  await cropper.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(cropper).toHaveCount(0);
  await expect(fileInput).toBeAttached();
});
