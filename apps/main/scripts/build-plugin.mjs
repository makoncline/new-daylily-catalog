import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const pluginRoot = path.join(repoRoot, "plugins/daylily-catalog");
const manifest = JSON.parse(
  await readFile(path.join(pluginRoot, "plugin.json"), "utf8"),
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

// Include only public package files. Reviewer credentials stay outside the ZIP.
for (const file of ["plugin.json", "mcp.json", "assets/icon.svg"]) {
  archive.file(file, await readFile(path.join(pluginRoot, file)));
}
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  await archive.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }),
);
console.log(outputPath);
