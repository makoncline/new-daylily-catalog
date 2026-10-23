import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(new URL("../package.json", import.meta.url));

test("image optimization keeps SVG loading available in the same process", async () => {
  const { getSharp } = require("next/dist/server/image-optimizer/transform");
  const sharp = getSharp();
  const original = await sharp({
    create: { width: 8, height: 8, channels: 4, background: "green" },
  })
    .png()
    .toBuffer();
  const optimized = await sharp(original).resize(4, 4).webp().toBuffer();
  const metadata = await sharp(optimized).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 4);
  assert.equal(metadata.height, 4);

  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="green"/></svg>',
  );
  const icon = await sharp(svg).resize(16, 16).png().toBuffer();
  const iconMetadata = await sharp(icon).metadata();
  assert.equal(iconMetadata.format, "png");
  assert.equal(iconMetadata.width, 16);
  assert.equal(iconMetadata.height, 16);
});
