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
import {
  ATLAS_FLOWS,
  capturesForState,
  flowCoverage,
  liveStateUrl,
  normalizedCaptureName,
} from "./agent-atlas-flows.mjs";
import { getAtlasRoot } from "./agent-atlas-paths.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const atlasRoot = getAtlasRoot(appRoot);
const captureDirectory = path.join(atlasRoot, "gallery-captures");
const reportDirectory = path.join(atlasRoot, "report");
const assetDirectory = path.join(reportDirectory, "gallery-assets");
const flowDirectory = path.join(reportDirectory, "flows");

if (process.argv.includes("--clean")) {
  rmSync(captureDirectory, { recursive: true, force: true });
  process.exit(0);
}

if (!existsSync(captureDirectory)) {
  throw new Error(
    "No gallery captures found. Run node scripts/run-agent-atlas-full.mjs first.",
  );
}

mkdirSync(assetDirectory, { recursive: true });
mkdirSync(flowDirectory, { recursive: true });
const items = readdirSync(captureDirectory)
  .filter((file) => file.endsWith(".json"))
  .map((file) =>
    JSON.parse(readFileSync(path.join(captureDirectory, file), "utf8")),
  )
  .sort((a, b) => a.key.localeCompare(b.key));

for (const item of items) {
  copyFileSync(
    path.join(captureDirectory, `${item.key}.png`),
    path.join(assetDirectory, `${item.key}.png`),
  );
}

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

function diagnosticsCount(item) {
  return Object.values(item.diagnostics ?? {}).reduce(
    (total, entries) => total + (Array.isArray(entries) ? entries.length : 0),
    0,
  );
}

function screenshotCard(item, assetPrefix = "") {
  const stateUrl = new URL(item.url);
  const route = `${stateUrl.pathname}${stateUrl.search}`;
  const liveUrl = liveStateUrl(item);
  return `<article class="shot">
    <a href="${assetPrefix}gallery-assets/${escapeHtml(item.key)}.png" target="_blank"><img src="${assetPrefix}gallery-assets/${escapeHtml(item.key)}.png" alt="${escapeHtml(displayName(normalizedCaptureName(item)))} screenshot" loading="lazy"></a>
    <div class="shot-copy">
      <p class="eyebrow">${escapeHtml(displayName(item.project))}</p>
      <h3>${escapeHtml(displayName(normalizedCaptureName(item)))}</h3>
      <p>${escapeHtml(item.description ?? "Repeatable application checkpoint.")}</p>
      <div class="meta"><code>${escapeHtml(route)}</code>${liveUrl ? `<a class="live-state" href="${escapeHtml(liveUrl)}" target="_blank" rel="noreferrer">Open in local app</a>` : ""}<span>${escapeHtml(item.viewport ? `${item.viewport.width}×${item.viewport.height}` : "viewport unknown")}</span><span>${diagnosticsCount(item)} diagnostics</span></div>
    </div>
  </article>`;
}

function pageShell({ title, description, body, root = false }) {
  const homeHref = root ? "gallery.html" : "../gallery.html";
  const allHref = root ? "all.html" : "../all.html";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · Daylily Catalog UI Atlas</title><style>
    :root{color-scheme:light;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#f4f4f1;color:#1d211c}*{box-sizing:border-box}body{margin:0;padding:40px}a{color:inherit}.top{max-width:1600px;margin:0 auto 32px}.nav{display:flex;gap:16px;margin-bottom:28px;font-size:.9rem}.nav a{color:#55704d;font-weight:700}.hero{max-width:850px}.hero h1{margin:0 0 10px;font-size:clamp(2rem,5vw,4rem);letter-spacing:-.05em}.hero p{color:#5f665c;font-size:1.05rem;line-height:1.6}.audience{display:inline-flex;padding:5px 9px;border-radius:999px;background:#e6eee2;color:#42613a;font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.flow-grid,.shots{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:24px;align-items:start}.flow-grid,.flow-main,.all-main{max-width:1600px;margin:auto}.flow-card,.shot,.missing{overflow:hidden;border:1px solid #d8dbd4;border-radius:18px;background:#fff;box-shadow:0 8px 30px rgb(30 40 25/6%)}.flow-card{padding:24px;text-decoration:none}.flow-card h2{margin:12px 0 8px}.flow-card p{color:#62685f;line-height:1.5}.coverage{margin-top:18px}.bar{height:7px;overflow:hidden;border-radius:99px;background:#e5e7e2}.bar span{display:block;height:100%;background:#6f8c64}.coverage small{display:block;margin-top:7px;color:#62685f}.step{margin:0 0 48px}.step-head{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:16px;border-bottom:1px solid #d8dbd4}.step-head h2{font-size:1.7rem}.step-head span{color:#62685f}.shot>a{display:block;max-height:520px;overflow:auto;background:#e8eae5;border-bottom:1px solid #d8dbd4}.shot img{display:block;width:100%;height:auto}.shot-copy{padding:20px}.eyebrow{margin:0 0 6px;color:#55704d;font-size:.72rem;font-weight:750;letter-spacing:.12em;text-transform:uppercase}.shot h3{margin:0 0 8px;font-size:1.2rem}.shot-copy>p:not(.eyebrow){min-height:44px;margin:0 0 14px;color:#62685f;line-height:1.45}.meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;color:#62685f;font-size:.8rem}.live-state{padding:6px 9px;border-radius:7px;background:#e6eee2;color:#42613a;font-weight:750;text-decoration:none}code{display:inline-block;max-width:100%;overflow:hidden;padding:6px 9px;border-radius:7px;background:#f0f2ed;color:#465143;text-overflow:ellipsis;white-space:nowrap}.missing{min-height:190px;padding:22px;border-style:dashed;background:#fafaf7}.missing strong{display:block;margin:10px 0}.missing p{color:#73786f}.status-missing{color:#9a5b20;background:#fff1da}.summary{margin:20px 0 0;color:#62685f}.all-main h2{margin-top:40px}@media(max-width:600px){body{padding:24px 14px}.flow-grid,.shots{grid-template-columns:1fr}}
  </style></head><body><header class="top"><nav class="nav"><a href="${homeHref}">Flows</a><a href="${allHref}">All checkpoints</a></nav><div class="hero"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div></header>${body}</body></html>`;
}

function flowCardsForAudience(audience) {
  return ATLAS_FLOWS.filter((flow) => flow.audience === audience)
    .map((flow) => {
      const coverage = flowCoverage(flow, items);
      const percentage = Math.round((coverage.captured / coverage.total) * 100);
      return `<a class="flow-card" href="flows/${escapeHtml(flow.id)}.html"><span class="audience">${escapeHtml(flow.audience)}</span><h2>${escapeHtml(flow.title)}</h2><p>${escapeHtml(flow.description)}</p><div class="coverage"><div class="bar"><span style="width:${percentage}%"></span></div><small>${coverage.captured} of ${coverage.total} declared UI states captured · ${percentage}%</small></div></a>`;
    })
    .join("\n");
}

const flowCards = `<section style="margin-bottom:56px"><h2>Public user flows</h2><p style="color:#62685f">Discover, browse, contact, join, and get help.</p><div class="flow-grid">${flowCardsForAudience("public")}</div></section><section style="margin-bottom:56px"><h2>Member flows</h2><p style="color:#62685f">Create, organize, publish, and operate a catalog.</p><div class="flow-grid">${flowCardsForAudience("member")}</div></section>`;

writeFileSync(
  path.join(reportDirectory, "gallery.html"),
  pageShell({
    root: true,
    title: "User Flow Atlas",
    description: `${items.length} verified checkpoints from production-shaped data and guarded local account variants. Coverage is measured against the audited flow manifest; declared gaps remain visible.`,
    body: `<main class="all-main">${flowCards}</main>`,
  }),
);

for (const flow of ATLAS_FLOWS) {
  const coverage = flowCoverage(flow, items);
  const sections = flow.steps
    .map((flowStep, stepIndex) => {
      const stateCards = flowStep.states
        .map((stateItem) => {
          const captures = capturesForState(items, stateItem);
          if (captures.length === 0) {
            return `<article class="missing"><span class="audience status-missing">Not captured</span><strong>${escapeHtml(stateItem.title)}</strong><p>This expected UI state remains in the flow coverage contract.</p></article>`;
          }
          return captures.map((item) => screenshotCard(item, "../")).join("\n");
        })
        .join("\n");
      return `<section class="step"><header class="step-head"><h2>${stepIndex + 1}. ${escapeHtml(flowStep.title)}</h2><span>${flowStep.states.length} expected states</span></header><div class="shots">${stateCards}</div></section>`;
    })
    .join("\n");
  writeFileSync(
    path.join(flowDirectory, `${flow.id}.html`),
    pageShell({
      title: flow.title,
      description: `${flow.description} ${coverage.captured} of ${coverage.total} declared UI states currently have screenshots.`,
      body: `<main class="flow-main">${sections}</main>`,
    }),
  );
}

const allCards = items.map((item) => screenshotCard(item)).join("\n");
writeFileSync(
  path.join(reportDirectory, "all.html"),
  pageShell({
    root: true,
    title: "All Checkpoints",
    description:
      "The ungrouped screenshot inventory for debugging and migration work.",
    body: `<main class="all-main"><div class="shots">${allCards}</div></main>`,
  }),
);

console.log(
  `Generated ${ATLAS_FLOWS.length} flow pages from ${items.length} screenshots at ${path.join(reportDirectory, "gallery.html")}`,
);
