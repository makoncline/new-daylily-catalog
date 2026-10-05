import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const pluginRoot = path.join(repoRoot, "plugins/daylily-catalog");
const manifest = JSON.parse(
  await readFile(path.join(pluginRoot, ".codex-plugin/plugin.json"), "utf8"),
);
const outputPath = path.resolve(
  process.argv[2] ??
    path.join(
      repoRoot,
      "local/plugins",
      `daylily-catalog-${manifest.version}.zip`,
    ),
);
const archive = new JSZip();

// This updates the existing hosted entry. Connection settings stay in OpenAI.
// Reviewer cases and credentials stay outside this metadata-only ZIP.
for (const file of [".codex-plugin/plugin.json", "assets/icon.svg"]) {
  archive.file(file, await readFile(path.join(pluginRoot, file)));
}
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  await archive.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }),
);
console.log(outputPath);
