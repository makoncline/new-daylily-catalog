import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

interface ViewerRow {
  id: string;
  post_id: string | null;
  post_title: string | null;
  local_relative_path: string | null;
  edited_relative_path: string | null;
  edit_status: string | null;
}

interface TableColumnRow {
  name: string;
}

interface ViewerManifest {
  generatedAt: string;
  totalRows: number;
  rows: Array<{
    id: string;
    postId: string | null;
    postTitle: string | null;
    originalPath: string;
    editedPath: string | null;
    editStatus: string | null;
  }>;
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_DIR = path.resolve(SCRIPT_DIR, "output");

function parseArgs() {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    if (idx === -1) return undefined;
    return args[idx + 1];
  };

  const outputDir = path.resolve(getArg("--output-dir") ?? DEFAULT_OUTPUT_DIR);
  const dbPath = path.resolve(
    getArg("--db") ?? path.join(outputDir, "cultivar-images.sqlite"),
  );
  const viewerDir = path.join(outputDir, "viewer");

  return { outputDir, dbPath, viewerDir };
}

function sqliteReadJson<T>(dbPath: string, sql: string): T[] {
  const output = execFileSync("sqlite3", ["-json", dbPath, sql], {
    encoding: "utf8",
  });
  const trimmed = output.trim();
  if (!trimmed) return [];
  return JSON.parse(trimmed) as T[];
}

function runSql(dbPath: string, sql: string) {
  execFileSync("sqlite3", [dbPath], {
    input: `${sql}\n`,
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
  });
}

function ensureViewerColumns(dbPath: string) {
  runSql(
    dbPath,
    `
CREATE TABLE IF NOT EXISTS cultivar_images (
  id TEXT PRIMARY KEY,
  post_id TEXT,
  post_title TEXT,
  img_url TEXT NOT NULL,
  local_relative_path TEXT,
  edit_status TEXT NOT NULL DEFAULT 'pending',
  edited_relative_path TEXT
);
`,
  );

  const columns = sqliteReadJson<TableColumnRow>(
    dbPath,
    "SELECT name FROM pragma_table_info('cultivar_images');",
  );
  const names = new Set(columns.map((column) => column.name));

  const alters: string[] = [];
  if (!names.has("edit_status")) {
    alters.push(
      "ALTER TABLE cultivar_images ADD COLUMN edit_status TEXT NOT NULL DEFAULT 'pending';",
    );
  }
  if (!names.has("edited_relative_path")) {
    alters.push(
      "ALTER TABLE cultivar_images ADD COLUMN edited_relative_path TEXT;",
    );
  }

  if (alters.length > 0) {
    runSql(dbPath, alters.join("\n"));
  }
}

function buildManifest(dbPath: string): ViewerManifest {
  const rows = sqliteReadJson<ViewerRow>(
    dbPath,
    `
SELECT
  id,
  post_id,
  post_title,
  local_relative_path,
  edited_relative_path,
  edit_status
FROM cultivar_images
WHERE local_relative_path IS NOT NULL
  AND local_relative_path <> ''
ORDER BY id;
`,
  );

  return {
    generatedAt: new Date().toISOString(),
    totalRows: rows.length,
    rows: rows.map((row) => ({
      id: row.id,
      postId: row.post_id,
      postTitle: row.post_title,
      originalPath: row.local_relative_path!,
      editedPath: row.edited_relative_path,
      editStatus: row.edit_status,
    })),
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toViewerSrc(relativePath: string): string {
  return `../${relativePath.replace(/^\/+/, "")}`;
}

function viewerHtml(manifest: ViewerManifest): string {
  const rowsHtml = manifest.rows
    .map((row) => {
      const originalSrc = toViewerSrc(row.originalPath);
      const editedSrc = row.editedPath ? toViewerSrc(row.editedPath) : null;
      const title = row.postTitle ?? "(untitled)";
      const meta = `id=${row.id} post_id=${row.postId ?? "null"} status=${row.editStatus ?? "unknown"}`;

      return `
      <tr>
        <td class="meta-cell">
          <div class="title">${escapeHtml(title)}</div>
          <div class="meta">${escapeHtml(meta)}</div>
        </td>
        <td class="img-cell">
          <img src="${escapeHtml(originalSrc)}" alt="${escapeHtml(`Original ${title}`)}" loading="lazy" />
        </td>
        <td class="img-cell">
          ${
            editedSrc
              ? `<img src="${escapeHtml(editedSrc)}" alt="${escapeHtml(`Edited ${title}`)}" loading="lazy" />`
              : '<div class="missing">No edited image yet</div>'
          }
        </td>
      </tr>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cultivar Image Compare</title>
    <style>
      body {
        margin: 0;
        background: #0f1115;
        color: #e7ecf3;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      }
      header {
        padding: 10px 14px;
        border-bottom: 1px solid #242b36;
        font-size: 13px;
        color: #9bb0d0;
      }
      main { padding: 12px; }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      thead th {
        text-align: left;
        font-size: 12px;
        color: #9bb0d0;
        border-bottom: 1px solid #2a3443;
        padding: 8px;
      }
      tbody td {
        border-bottom: 1px solid #1f2733;
        padding: 8px;
        vertical-align: top;
      }
      .meta-cell {
        width: 260px;
      }
      .title {
        font-size: 13px;
        margin-bottom: 4px;
      }
      .meta {
        font-size: 11px;
        color: #8ea0bb;
      }
      .img-cell {
        width: 360px;
      }
      .img-cell img {
        width: 340px;
        height: 340px;
        object-fit: contain;
        background: #121826;
        border: 1px solid #2a3443;
        border-radius: 6px;
        display: block;
      }
      .missing {
        width: 340px;
        height: 340px;
        display: grid;
        place-items: center;
        border: 1px dashed #3a4558;
        border-radius: 6px;
        color: #8ea0bb;
        font-size: 12px;
      }
      @media (max-width: 1200px) {
        .img-cell, .meta-cell { width: auto; }
        .img-cell img, .missing { width: 100%; height: auto; min-height: 220px; }
      }
    </style>
  </head>
  <body>
    <header>
      rows=${manifest.totalRows} generated=${manifest.generatedAt}
    </header>
    <main>
      <table>
        <thead>
          <tr>
            <th>Info</th>
            <th>Original</th>
            <th>Edited</th>
          </tr>
        </thead>
        <tbody>
${rowsHtml}
        </tbody>
      </table>
    </main>
  </body>
</html>
`;
}

function run() {
  const options = parseArgs();
  fs.mkdirSync(options.viewerDir, { recursive: true });
  ensureViewerColumns(options.dbPath);

  const manifest = buildManifest(options.dbPath);
  const manifestPath = path.join(options.viewerDir, "manifest.json");
  const htmlPath = path.join(options.viewerDir, "index.html");

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  fs.writeFileSync(htmlPath, viewerHtml(manifest), "utf8");

  console.log(`[compare-viewer] Wrote ${manifestPath}`);
  console.log(`[compare-viewer] Wrote ${htmlPath}`);
  console.log(`[compare-viewer] Rows in manifest: ${manifest.totalRows}`);
}

run();
