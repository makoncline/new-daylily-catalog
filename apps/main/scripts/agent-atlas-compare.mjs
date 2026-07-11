#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const appRoot = path.resolve(import.meta.dirname, "..");
const atlasRoot = path.join(appRoot, "local", "agent-atlas");
const captures = path.join(atlasRoot, "gallery-captures");
const baseline = path.join(atlasRoot, "baseline");
const reportRoot = path.join(atlasRoot, "report");
const assetRoot = path.join(reportRoot, "comparison-assets");
const threshold = Number(process.env.AGENT_ATLAS_DIFF_PERCENT ?? "0.1");

if (!existsSync(baseline)) {
  throw new Error("No approved baseline. Run pnpm agent:baseline first.");
}
rmSync(assetRoot, { recursive: true, force: true });
mkdirSync(assetRoot, { recursive: true });

async function compareImages(beforePath, afterPath, diffPath) {
  const beforeImage = sharp(beforePath).ensureAlpha();
  const afterImage = sharp(afterPath).ensureAlpha();
  const [beforeMeta, afterMeta] = await Promise.all([beforeImage.metadata(), afterImage.metadata()]);
  if (beforeMeta.width !== afterMeta.width || beforeMeta.height !== afterMeta.height) {
    return { changedPixels: null, totalPixels: null, percent: 100, dimensionsChanged: true };
  }
  const [{ data: before }, { data: after }] = await Promise.all([
    beforeImage.raw().toBuffer({ resolveWithObject: true }),
    afterImage.raw().toBuffer({ resolveWithObject: true }),
  ]);
  const diff = Buffer.alloc(before.length);
  let changedPixels = 0;
  for (let offset = 0; offset < before.length; offset += 4) {
    const delta = Math.max(
      Math.abs(before[offset] - after[offset]),
      Math.abs(before[offset + 1] - after[offset + 1]),
      Math.abs(before[offset + 2] - after[offset + 2]),
      Math.abs(before[offset + 3] - after[offset + 3]),
    );
    if (delta > 20) {
      changedPixels += 1;
      diff[offset] = 239;
      diff[offset + 1] = 68;
      diff[offset + 2] = 68;
      diff[offset + 3] = 255;
    } else {
      const gray = Math.round((after[offset] + after[offset + 1] + after[offset + 2]) / 3);
      diff[offset] = gray;
      diff[offset + 1] = gray;
      diff[offset + 2] = gray;
      diff[offset + 3] = 80;
    }
  }
  const totalPixels = before.length / 4;
  await sharp(diff, { raw: { width: beforeMeta.width, height: beforeMeta.height, channels: 4 } })
    .png()
    .toFile(diffPath);
  return {
    changedPixels,
    totalPixels,
    percent: (changedPixels / totalPixels) * 100,
    dimensionsChanged: false,
  };
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

const results = [];
for (const file of readdirSync(captures).filter((name) => name.endsWith(".json")).sort()) {
  const item = JSON.parse(readFileSync(path.join(captures, file), "utf8"));
  const beforePath = path.join(baseline, `${item.key}.png`);
  const afterPath = path.join(captures, `${item.key}.png`);
  if (!existsSync(beforePath)) {
    const afterAsset = `${item.key}-after.png`;
    copyFileSync(afterPath, path.join(assetRoot, afterAsset));
    results.push({ ...item, status: "new", percent: 100, dimensionsChanged: false, afterAsset });
    continue;
  }
  const beforeAsset = `${item.key}-before.png`;
  const afterAsset = `${item.key}-after.png`;
  const diffAsset = `${item.key}-diff.png`;
  copyFileSync(beforePath, path.join(assetRoot, beforeAsset));
  copyFileSync(afterPath, path.join(assetRoot, afterAsset));
  const comparison = await compareImages(beforePath, afterPath, path.join(assetRoot, diffAsset));
  results.push({
    ...item,
    ...comparison,
    status: comparison.percent > threshold ? "review" : "unchanged",
    beforeAsset,
    afterAsset,
    diffAsset: comparison.dimensionsChanged ? null : diffAsset,
  });
}

const summary = {
  generatedAt: new Date().toISOString(),
  thresholdPercent: threshold,
  compared: results.length,
  unchanged: results.filter((item) => item.status === "unchanged").length,
  review: results.filter((item) => item.status === "review").length,
  new: results.filter((item) => item.status === "new").length,
};
const payload = { summary, results };
writeFileSync(path.join(reportRoot, "comparison.json"), `${JSON.stringify(payload, null, 2)}\n`);
writeFileSync(
  path.join(reportRoot, "comparison.md"),
  `# Agent atlas comparison\n\n- Compared: ${summary.compared}\n- Unchanged: ${summary.unchanged}\n- Needs review: ${summary.review}\n- New: ${summary.new}\n- Threshold: ${summary.thresholdPercent}%\n\n${results
    .filter((item) => item.status !== "unchanged")
    .map((item) => `- **${item.key}**: ${item.status} (${item.percent.toFixed(3)}%)`)
    .join("\n")}\n`,
);

const cards = results
  .map((item) => `<article class="card ${item.status}"><header><strong>${escapeHtml(item.name)}</strong><span>${item.status} · ${item.percent.toFixed(3)}%</span></header><p>${escapeHtml(item.description ?? item.url)}</p><div class="images">${item.beforeAsset ? `<figure><figcaption>Baseline</figcaption><img src="comparison-assets/${item.beforeAsset}"></figure>` : ""}<figure><figcaption>Current</figcaption><img src="comparison-assets/${item.afterAsset ?? `${item.key}-after.png`}"></figure>${item.diffAsset ? `<figure><figcaption>Difference</figcaption><img src="comparison-assets/${item.diffAsset}"></figure>` : ""}</div></article>`)
  .join("\n");
writeFileSync(
  path.join(reportRoot, "visual-review.html"),
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Atlas comparison</title><style>body{font:15px system-ui;margin:0;padding:32px;background:#f5f5f2;color:#20231f}main{display:grid;gap:20px}.summary,.card{background:white;border:1px solid #ddd;border-radius:14px;padding:18px}.card.review{border-color:#ef4444}.card.new{border-color:#d97706}header{display:flex;justify-content:space-between;gap:12px}.images{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}figure{margin:0;max-height:440px;overflow:auto;border:1px solid #ddd}figcaption{position:sticky;top:0;background:#20231f;color:white;padding:6px 9px}img{display:block;width:100%}@media(max-width:800px){.images{grid-template-columns:1fr}}</style></head><body><section class="summary"><h1>Atlas comparison</h1><p>${summary.unchanged} unchanged · ${summary.review} need review · ${summary.new} new · ${summary.compared} compared</p></section><main>${cards}</main></body></html>`,
);
console.log(JSON.stringify(summary, null, 2));
if ((summary.review > 0 || summary.new > 0) && process.env.AGENT_ATLAS_ALLOW_CHANGES !== "1") process.exitCode = 2;
