import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const nextServerDir = path.join(process.cwd(), ".next/server");
const packageJsonPath = path.join(nextServerDir, "package.json");

await writeFile(packageJsonPath, '{"type":"commonjs"}\n');

async function findTraceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findTraceFiles(absolutePath)));
    } else if (entry.isFile() && entry.name.endsWith(".nft.json")) {
      files.push(absolutePath);
    }
  }

  return files;
}

for (const traceFile of await findTraceFiles(nextServerDir)) {
  const trace = JSON.parse(await readFile(traceFile, "utf8"));
  const relativePackagePath = path.relative(path.dirname(traceFile), packageJsonPath);

  if (!trace.files.includes(relativePackagePath)) {
    trace.files.push(relativePackagePath);
    trace.files.sort();
    await writeFile(traceFile, `${JSON.stringify(trace)}\n`);
  }
}
