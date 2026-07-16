#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  getAtlasFlow,
  resolveLiveStateUrl,
  statesForFlow,
} from "./atlas-flows.mjs";
const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
export function generateAtlasGallery({
  flowId,
  outputDirectory,
  baseURL = "http://localhost:3210",
}) {
  const flow = getAtlasFlow(flowId);
  const captureDirectory = path.join(outputDirectory, "screenshots");
  const missing = statesForFlow(flow)
    .filter(({ capture }) => !existsSync(path.join(captureDirectory, capture)))
    .map(({ id }) => id);
  if (missing.length)
    throw new Error(`Missing Atlas states: ${missing.join(", ")}`);

  const tests = Object.entries(flow.tests)
    .map(
      ([layer, references]) =>
        `<section><h2>${escapeHtml(layer)}</h2>${
          references.length
            ? references
                .map(
                  (reference) =>
                    `<p><code>${escapeHtml(reference.path)}</code><br><code>${escapeHtml(reference.command)}</code></p>`,
                )
                .join("")
            : "<p>None declared.</p>"
        }</section>`,
    )
    .join("");
  const steps = flow.steps
    .map(
      (step, index) =>
        `<section class="step"><h2>${index + 1}. ${escapeHtml(step.title)}</h2><div class="grid">${step.states
          .map((stateItem) => {
            const liveUrl = resolveLiveStateUrl(stateItem, baseURL);
            return `<article><a href="screenshots/${escapeHtml(stateItem.capture)}"><img src="screenshots/${escapeHtml(stateItem.capture)}" alt="${escapeHtml(stateItem.title)} screenshot" loading="lazy"></a><div class="copy"><h3>${escapeHtml(stateItem.title)}</h3><p>${escapeHtml(stateItem.description)}</p><p class="meta"><code>${escapeHtml(stateItem.url)}</code>${liveUrl ? `<a href="${escapeHtml(liveUrl)}" target="_blank" rel="noreferrer">Open live</a>` : "<span>Requires interaction</span>"}</p><details><summary>Reproduce</summary><code>${escapeHtml(stateItem.reproductionCommand)}</code></details></div></article>`;
          })
          .join("")}</div></section>`,
    )
    .join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(flow.title)} · UI Atlas</title><style>
  :root{font-family:Inter,ui-sans-serif,system-ui;color:#20251f;background:#f4f5f1}*{box-sizing:border-box}body{margin:0;padding:36px}main{max-width:1600px;margin:auto}header{max-width:850px;margin-bottom:38px}h1{font-size:clamp(2.3rem,5vw,4.5rem);letter-spacing:-.05em;margin:0 0 12px}h2{text-transform:capitalize}header p,.copy p,section>p{color:#62685f;line-height:1.5}.tests{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:28px 0 50px}.tests section,article{border:1px solid #d9ddd4;border-radius:16px;background:white;overflow:hidden}.tests section{padding:18px}.tests h2{margin-top:0}.step{margin-bottom:50px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:22px;align-items:start}article>a{display:block;max-height:520px;overflow:auto;background:#e7e9e3;border-bottom:1px solid #d9ddd4}img{display:block;width:100%;height:auto}.copy{padding:18px}.copy h3{margin:0 0 8px}.meta{display:flex;flex-wrap:wrap;gap:9px;align-items:center}.meta a,.meta span{padding:6px 9px;border-radius:7px;background:#e7efe3;color:#3f6037;font-weight:700;text-decoration:none}code{display:inline-block;max-width:100%;overflow:auto;padding:6px 8px;border-radius:6px;background:#eef0eb;font-size:.78rem}details code{margin-top:10px}@media(max-width:800px){body{padding:22px 12px}.tests{grid-template-columns:1fr}.grid{grid-template-columns:1fr}}
  </style></head><body><main><header><p>Daylily Catalog UI Atlas</p><h1>${escapeHtml(flow.title)}</h1><p>${escapeHtml(flow.description)}</p></header><div class="tests">${tests}</div>${steps}</main></body></html>`;
  mkdirSync(outputDirectory, { recursive: true });
  const galleryPath = path.join(outputDirectory, "index.html");
  writeFileSync(galleryPath, html);
  return galleryPath;
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const value = (name) =>
    process.argv
      .find((argument) => argument.startsWith(`${name}=`))
      ?.slice(name.length + 1);
  const flowId = value("--flow");
  const output = value("--output");
  if (!flowId || !output)
    throw new Error(
      "Usage: generate-atlas-gallery.mjs --flow=<id> --output=<directory>",
    );
  console.log(
    path.resolve(
      generateAtlasGallery({
        flowId,
        outputDirectory: path.resolve(output),
        baseURL: value("--base-url"),
      }),
    ),
  );
}
