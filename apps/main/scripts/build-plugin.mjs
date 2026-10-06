import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const pluginRoot = path.join(repoRoot, "plugins/daylily-catalog");
const manifest = JSON.parse(
  await readFile(path.join(pluginRoot, "plugin.json"), "utf8"),
);
manifest.extensions["com.openai"].review.test_cases = JSON.parse(
  await readFile(path.join(pluginRoot, "review-cases.json"), "utf8"),
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

archive.file("plugin.json", `${JSON.stringify(manifest, null, 2)}\n`);
// Each release must contain the MCP endpoint and all referenced assets.
// OAuth grants and reviewer credentials stay in the private hosted setup.
for (const file of ["mcp.json", "assets/icon.svg"]) {
  archive.file(file, await readFile(path.join(pluginRoot, file)));
}
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  await archive.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }),
);
console.log(outputPath);
