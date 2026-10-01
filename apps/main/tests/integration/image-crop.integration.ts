import path from "node:path";
import { mkdirSync } from "node:fs";
import sharp from "sharp";
import { jsonlStreamProducer } from "@trpc/server/unstable-core-do-not-import";
import SuperJSON from "superjson";
import { expect, test } from "./fixtures";

test.use({ video: process.env.IMAGE_CROP_PROOF_DIR ? "on" : "off" });

test("browser agents can crop listing and profile photos with labelled inputs", async ({
  page,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Integration baseURL is required.");
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
    const left = type === "listing" ? "1000" : "0";
    const top = type === "listing" ? "0" : "1000";
    uploadedBytes = null;
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
    await fileInput.setInputFiles({
      name: "crop-proof.png",
      mimeType: "image/png",
      buffer: type === "listing" ? source : portraitSource,
    });
    const preview = page.getByRole("img", { name: "Crop preview" });
    await expect(preview).toBeVisible();
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
    const uploadButton = page.getByRole("button", {
      name: "Upload",
      exact: true,
    });
    await expect(uploadButton).toBeEnabled();
    await page.getByLabel("Left (px)", { exact: true }).fill(left);
    await page.getByLabel("Top (px)", { exact: true }).fill(top);
    await page.getByLabel("Size (px)", { exact: true }).fill("2500");
    await page.getByRole("button", { name: "Apply crop" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Use whole pixels." }),
    ).toContainText("stay inside the image");
    await expect(uploadButton).toBeDisabled();
    await page.getByLabel("Size (px)", { exact: true }).fill("2000");
    await page.getByRole("button", { name: "Apply crop" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Upload size:" }),
    ).toHaveText("Upload size: 1600 × 1600px.");
    await expect(uploadButton).toBeEnabled();
    await page.setViewportSize(
      type === "listing"
        ? { width: 960, height: 900 }
        : { width: 360, height: 874 },
    );
    await expect(page.getByLabel("Left (px)", { exact: true })).toHaveValue(
      left,
    );
    await expect(page.getByLabel("Size (px)", { exact: true })).toHaveValue(
      "2000",
    );
    if (process.env.IMAGE_CROP_PROOF_DIR) {
      mkdirSync(process.env.IMAGE_CROP_PROOF_DIR, { recursive: true });
      await page.screenshot({
        path: path.join(process.env.IMAGE_CROP_PROOF_DIR, `${type}-crop.png`),
        fullPage: true,
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
  }
});
