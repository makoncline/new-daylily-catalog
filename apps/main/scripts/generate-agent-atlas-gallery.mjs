#!/usr/bin/env node

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const appRoot = path.resolve(import.meta.dirname, "..");
const atlasRoot = path.join(appRoot, "local", "agent-atlas");
const captureDirectory = path.join(atlasRoot, "gallery-captures");
const reportDirectory = path.join(atlasRoot, "report");
const assetDirectory = path.join(reportDirectory, "gallery-assets");

if (process.argv.includes("--clean")) {
  rmSync(captureDirectory, { recursive: true, force: true });
  process.exit(0);
}

const descriptions = {
  "catalog-directory": "Production-shaped catalog discovery with active growers and listing counts.",
  "rolling-oaks-public-catalog": "Large public catalog with thousands of listings and profile media.",
  "plant-fancy-public-catalog": "Medium public pro catalog used as the second authenticated persona.",
  "representative-public-listing": "A real copied listing detail page with catalog context and media.",
  "signed-out-onboarding": "The first-time grower flow as seen by an anonymous visitor.",
  "catalog-directory-mobile": "Catalog discovery at a touch-friendly mobile viewport.",
  "rolling-oaks-public-mobile": "The large Rolling Oaks catalog at a mobile viewport.",
  "dashboard-overview": "Authenticated catalog totals and management summary.",
  "dashboard-listings": "Authenticated listing management using realistic catalog volume.",
  "dashboard-lists": "Authenticated list organization and management.",
  "dashboard-profile": "Authenticated public-profile content and image management.",
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function displayName(value) {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

if (!existsSync(captureDirectory)) {
  throw new Error("No gallery captures found. Run pnpm agent:capture first.");
}

mkdirSync(assetDirectory, { recursive: true });
const items = readdirSync(captureDirectory)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(path.join(captureDirectory, file), "utf8")))
  .sort((a, b) => a.key.localeCompare(b.key));

for (const item of items) {
  copyFileSync(
    path.join(captureDirectory, `${item.key}.png`),
    path.join(assetDirectory, `${item.key}.png`),
  );
}

const cards = items
  .map((item) => {
    const persona = displayName(item.project);
    const normalizedName = item.name.startsWith(`${item.project}-`)
      ? item.name.slice(item.project.length + 1)
      : item.name;
    const title = displayName(normalizedName);
    const description =
      item.description ??
      descriptions[normalizedName] ??
      "Repeatable application checkpoint.";
    const route = new URL(item.url).pathname;
    return `
      <article class="card">
        <a href="gallery-assets/${escapeHtml(item.key)}.png" target="_blank">
          <img src="gallery-assets/${escapeHtml(item.key)}.png" alt="${escapeHtml(title)} screenshot" loading="lazy">
        </a>
        <div class="content">
          <p class="eyebrow">${escapeHtml(persona)}</p>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(description)}</p>
          <code>${escapeHtml(route)}</code>
        </div>
      </article>`;
  })
  .join("\n");

writeFileSync(
  path.join(reportDirectory, "gallery.html"),
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Daylily Catalog UI Atlas</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f4f4f1; color: #1d211c; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 40px; }
    header { max-width: 760px; margin: 0 auto 32px; text-align: center; }
    h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 4rem); letter-spacing: -.05em; }
    header p { color: #5f665c; font-size: 1.05rem; line-height: 1.6; }
    .grid { max-width: 1600px; margin: auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 24px; align-items: start; }
    .card { overflow: hidden; border: 1px solid #d8dbd4; border-radius: 18px; background: #fff; box-shadow: 0 8px 30px rgb(30 40 25 / 6%); }
    .card > a { display: block; max-height: 520px; overflow: auto; background: #e8eae5; border-bottom: 1px solid #d8dbd4; }
    img { display: block; width: 100%; height: auto; }
    .content { padding: 20px; }
    .eyebrow { margin: 0 0 6px; color: #55704d; font-size: .72rem; font-weight: 750; letter-spacing: .12em; text-transform: uppercase; }
    h2 { margin: 0 0 8px; font-size: 1.25rem; }
    .content > p:not(.eyebrow) { min-height: 44px; margin: 0 0 14px; color: #62685f; line-height: 1.45; }
    code { display: inline-block; max-width: 100%; overflow: hidden; padding: 6px 9px; border-radius: 7px; background: #f0f2ed; color: #465143; text-overflow: ellipsis; white-space: nowrap; }
    @media (max-width: 600px) { body { padding: 24px 14px; } .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <h1>UI Atlas</h1>
    <p>${items.length} production-shaped checkpoints across anonymous, mobile, Rolling Oaks, and PlantFancy experiences. Click any screenshot to inspect it full size.</p>
  </header>
  <main class="grid">${cards}</main>
</body>
</html>`,
);

console.log(`Generated ${items.length}-image gallery at ${path.join(reportDirectory, "gallery.html")}`);
