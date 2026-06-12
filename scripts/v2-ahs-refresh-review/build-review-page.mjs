#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const DEFAULT_DELTA_DIR = path.join(
  REPO_ROOT,
  "prisma",
  "data-migrations",
  "v2-ahs-cultivar-delta",
);
const DEFAULT_OUTPUT_PATH = path.join(
  REPO_ROOT,
  "downloads",
  "v2-ahs-refresh-review",
  "index.html",
);

const REVIEW_COLUMNS = [
  "post_id",
  "link_normalized_name",
  "post_title",
  "post_status",
  "introduction_date",
  "primary_hybridizer_id",
  "primary_hybridizer_name",
  "additional_hybridizers_ids",
  "additional_hybridizers_names",
  "hybridizer_code_legacy",
  "seedling_number",
  "bloom_season_ids",
  "bloom_season_names",
  "fragrance_ids",
  "fragrance_names",
  "bloom_habit_ids",
  "bloom_habit_names",
  "foliage_ids",
  "foliage_names",
  "ploidy_ids",
  "ploidy_names",
  "scape_height_in",
  "bloom_size_in",
  "bud_count",
  "branches",
  "color",
  "rebloom",
  "flower_form_ids",
  "flower_form_names",
  "double_percentage",
  "polymerous_percentage",
  "spider_ratio",
  "petal_length_in",
  "petal_width_in",
  "unusual_forms_ids",
  "unusual_forms_names",
  "parentage",
  "images_count",
  "image_url",
  "awards_json",
];
const NEW_ROW_FIELD_COLUMNS = [
  "id",
  ...REVIEW_COLUMNS,
  "last_updated",
];

function parseArgs() {
  const args = {
    deltaDir: DEFAULT_DELTA_DIR,
    output: DEFAULT_OUTPUT_PATH,
  };

  for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === "--delta-dir" && next) {
      args.deltaDir = path.resolve(next);
      index += 1;
      continue;
    }

    if (arg === "--output" && next) {
      args.output = path.resolve(next);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function openDatabase(dbPath) {
  return new DatabaseSync(dbPath, { readOnly: true });
}

function readRowById(database, tableName, id) {
  return database.prepare(`SELECT * FROM "${tableName}" WHERE "id" = ?`).get(id);
}

function sourceValue(sourceRow, summaryRow, column) {
  if (column === "link_normalized_name") {
    return summaryRow.normalizedNameAfter;
  }

  return sourceRow?.[column] ?? null;
}

function prodValue(prodRow, summaryRow, column) {
  if (column === "link_normalized_name") {
    return summaryRow.normalizedNameBefore;
  }

  return prodRow?.[column] ?? null;
}

function buildReviewData(summary) {
  const prodDb = openDatabase(summary.prodDbPath);
  const sourceDb = openDatabase(summary.sourceDbPath);

  try {
    const newRows = summary.newRows.map((row) => {
      const sourceRow = readRowById(sourceDb, "cultivars", row.id);
      const fields = Object.fromEntries(
        NEW_ROW_FIELD_COLUMNS.map((column) => [
          column,
          sourceValue(sourceRow, {
            normalizedNameAfter: row.normalizedName,
          }, column),
        ]),
      );

      return {
        id: row.id,
        postTitle: row.postTitle,
        normalizedName: row.normalizedName,
        introductionDate: row.introductionDate,
        lastUpdated: row.lastUpdated,
        action: row.action,
        primaryHybridizerName: sourceRow?.primary_hybridizer_name ?? null,
        imageUrl: sourceRow?.image_url ?? null,
        fields,
      };
    });

    const updateRows = summary.changedRows.map((row) => {
      const prodRow = readRowById(prodDb, "V2AhsCultivar", row.id);
      const sourceRow = readRowById(sourceDb, "cultivars", row.id);
      const changes = row.changedColumns
        .filter((column) => REVIEW_COLUMNS.includes(column))
        .map((column) => ({
          column,
          oldValue: prodValue(prodRow, row, column),
          newValue: sourceValue(sourceRow, row, column),
        }));

      return {
        id: row.id,
        title: sourceRow?.post_title ?? row.postTitleAfter,
        sourceLastUpdated: sourceRow?.last_updated ?? null,
        changedColumns: row.changedColumns,
        changes,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      prodDbPath: summary.prodDbPath,
      sourceDbPath: summary.sourceDbPath,
      counts: summary.counts,
      newRows,
      updateRows,
    };
  } finally {
    prodDb.close();
    sourceDb.close();
  }
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function buildHtml(reviewData) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>V2 AHS Refresh Review</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f3ef;
      --panel: #ffffff;
      --ink: #1e2528;
      --muted: #667077;
      --line: #d9d3c8;
      --accent: #186f65;
      --accent-soft: #e1efec;
      --warn: #9b4a00;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, monospace;
      font-size: 14px;
    }

    header {
      position: sticky;
      top: 0;
      z-index: 10;
      border-bottom: 1px solid var(--line);
      background: rgba(245, 243, 239, 0.96);
      padding: 14px 18px;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 20px;
      letter-spacing: -0.03em;
    }

    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      color: var(--muted);
    }

    .pill {
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--panel);
      padding: 4px 8px;
    }

    main { padding: 18px; }

    .tabs, .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-bottom: 12px;
    }

    button, select, input {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      color: var(--ink);
      font: inherit;
      padding: 8px 10px;
    }

    button.active, button.primary {
      border-color: var(--accent);
      background: var(--accent);
      color: white;
    }

    button.soft {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: var(--accent);
    }

    input { min-width: 260px; }

    .panel {
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--panel);
      overflow: hidden;
    }

    .list {
      display: grid;
      gap: 12px;
    }

    .card {
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--panel);
      overflow: hidden;
    }

    .card-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 10px;
      border-bottom: 1px solid var(--line);
      background: #fbfaf6;
      padding: 10px 12px;
    }

    .new-card-head {
      align-items: flex-start;
    }

    .card-title {
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      color: var(--muted);
      font-size: 12px;
    }

    .field-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 0;
      padding: 0 12px 12px;
    }

    .field {
      min-width: 0;
      border-bottom: 1px solid #ebe6dc;
      padding: 8px 10px;
    }

    .field-label {
      margin-bottom: 3px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .field-value {
      min-height: 18px;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .empty-value { color: #b3a899; }

    .muted { color: var(--muted); }
    .warn { color: var(--warn); }
    .hidden { display: none; }
    .diff-grid {
      display: grid;
      grid-template-columns: minmax(160px, 220px) minmax(0, 1fr) minmax(0, 1fr);
      gap: 0;
      padding: 0 12px 12px;
    }

    .diff-grid > div {
      border-bottom: 1px solid var(--line);
      padding: 8px;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .field-name {
      background: #f8f6f1;
      font-weight: 700;
    }

    .new-value { background: #f0f8f3; }
    .old-value { background: #fbf1ee; }

    .diff-heading {
      background: #eee9df;
      color: #3f474c;
      font-weight: 800;
    }

    .image-preview {
      display: block;
      width: 200px;
      height: 200px;
      object-fit: cover;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #f8f6f1;
    }

    .image-wrap {
      display: grid;
      gap: 6px;
      justify-items: end;
      max-width: 220px;
    }

    textarea {
      width: 100%;
      min-height: 260px;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px;
      font: 12px ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, monospace;
    }
  </style>
</head>
<body>
  <header>
    <h1>V2 AHS Refresh Review</h1>
    <div class="stats" id="stats"></div>
  </header>

  <main>
    <div class="tabs">
      <button class="active" data-tab-button="new">New Additions</button>
      <button data-tab-button="updates">Updates</button>
      <button data-tab-button="sql">Generated SQL</button>
    </div>

    <section id="tab-new" class="panel"></section>

    <section id="tab-updates" class="hidden">
      <div class="toolbar">
        <input id="search" placeholder="Filter by id, title, or value">
        <select id="column-filter"></select>
        <button class="soft" id="select-visible">Select visible fields</button>
        <button id="clear-visible">Clear visible fields</button>
        <button class="primary" id="generate-sql">Generate SQL</button>
      </div>
      <div class="panel" id="updates-table"></div>
    </section>

    <section id="tab-sql" class="hidden">
      <div class="toolbar">
        <button class="primary" id="copy-sql">Copy SQL</button>
        <span class="muted">Generated SQL updates only selected changed fields. It also updates source last_updated for approved rows.</span>
      </div>
      <textarea id="sql-output" spellcheck="false"></textarea>
    </section>
  </main>

  <script>
    const REVIEW_DATA = ${escapeJsonForHtml(reviewData)};
    const selected = new Set();

    const stats = document.getElementById("stats");
    stats.innerHTML = [
      ["prod", REVIEW_DATA.counts.prodV2Rows],
      ["source", REVIEW_DATA.counts.sourceRows],
      ["new", REVIEW_DATA.counts.newRows],
      ["updates", REVIEW_DATA.counts.changedRows],
      ["generated", REVIEW_DATA.generatedAt],
    ].map(([label, value]) => '<span class="pill">' + label + ': ' + value + '</span>').join("");

    function sqlValue(value) {
      if (value === null || value === undefined || value === "") return "NULL";
      if (typeof value === "number") return String(value);
      return "'" + String(value).replaceAll("'", "''") + "'";
    }

    function showTab(name) {
      for (const section of ["new", "updates", "sql"]) {
        document.getElementById("tab-" + section).classList.toggle("hidden", section !== name);
        document.querySelector('[data-tab-button="' + section + '"]').classList.toggle("active", section === name);
      }
    }

    document.querySelectorAll("[data-tab-button]").forEach((button) => {
      button.addEventListener("click", () => showTab(button.dataset.tabButton));
    });

    function renderNewRows() {
      const rows = REVIEW_DATA.newRows.map((row) => {
        const fields = Object.entries(row.fields || {}).map(([label, value]) =>
          '<div class="field">' +
            '<div class="field-label">' + escapeHtml(label) + '</div>' +
            '<div class="field-value">' + renderValue(value) + '</div>' +
          '</div>'
        ).join("");

        return '<article class="card">' +
          '<div class="card-head new-card-head">' +
            '<div><div class="card-title">' + escapeHtml(row.postTitle || "(untitled)") + '</div>' +
            '<div class="card-meta"><span>id ' + escapeHtml(row.id) + '</span><span>' + escapeHtml(row.action || "") + '</span><span>' + escapeHtml(row.introductionDate || "") + '</span></div></div>' +
            renderImage(row.imageUrl) +
          '</div>' +
          '<div class="field-grid">' + fields + '</div>' +
        '</article>';
      }).join("");

      document.getElementById("tab-new").innerHTML =
        '<div class="list">' + rows + '</div>';
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[char]));
    }

    function escapeAttr(value) {
      return escapeHtml(value);
    }

    function renderValue(value) {
      if (value === null || value === undefined || value === "") {
        return '<span class="empty-value">NULL</span>';
      }

      if (typeof value === "string" && /^https?:\\/\\//.test(value)) {
        return '<a href="' + escapeAttr(value) + '" target="_blank">' + escapeHtml(value) + '</a>';
      }

      return escapeHtml(value);
    }

    function renderImage(url) {
      if (!url) {
        return '<span class="muted">no image</span>';
      }

      return '<div class="image-wrap">' +
        '<a href="' + escapeAttr(url) + '" target="_blank">' +
          '<img class="image-preview" src="' + escapeAttr(url) + '" alt="source image" loading="lazy">' +
        '</a>' +
        '<a href="' + escapeAttr(url) + '" target="_blank">open source image</a>' +
      '</div>';
    }

    function fieldKey(rowId, column) {
      return rowId + "::" + column;
    }

    function rowMatches(row, query, column) {
      if (column && !row.changes.some((change) => change.column === column)) return false;
      if (!query) return true;
      const text = JSON.stringify(row).toLowerCase();
      return text.includes(query.toLowerCase());
    }

    function renderColumnFilter() {
      const counts = new Map();
      for (const row of REVIEW_DATA.updateRows) {
        for (const change of row.changes) {
          counts.set(change.column, (counts.get(change.column) || 0) + 1);
        }
      }
      const options = ['<option value="">All changed fields</option>']
        .concat([...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([column, count]) => '<option value="' + escapeAttr(column) + '">' + column + ' (' + count + ')</option>'));
      document.getElementById("column-filter").innerHTML = options.join("");
    }

    function visibleRows() {
      const query = document.getElementById("search").value.trim();
      const column = document.getElementById("column-filter").value;
      return REVIEW_DATA.updateRows.filter((row) => rowMatches(row, query, column));
    }

    function renderUpdates() {
      const rows = visibleRows().slice(0, 500);
      const html = rows.map((row) => {
        const changes = [
          '<div class="diff-heading">field</div><div class="diff-heading">old</div><div class="diff-heading">new</div>',
          ...row.changes.map((change) => {
          const key = fieldKey(row.id, change.column);
          const checked = selected.has(key) ? " checked" : "";
          return '<div class="field-name"><label><input type="checkbox" data-field-key="' + escapeAttr(key) + '"' + checked + '> ' + escapeHtml(change.column) + '</label></div>' +
            '<div class="old-value">' + renderValue(change.oldValue) + '</div>' +
            '<div class="new-value">' + renderValue(change.newValue) + '</div>';
          })
        ].join("");

        return '<article class="card">' +
          '<div class="card-head">' +
            '<div><div class="card-title">' + escapeHtml(row.title || "(untitled)") + '</div>' +
            '<div class="card-meta"><span>id ' + escapeHtml(row.id) + '</span><span>' + escapeHtml(row.changedColumns.length) + ' fields</span><span>source updated ' + escapeHtml(row.sourceLastUpdated || "") + '</span></div></div>' +
          '</div>' +
          '<div class="diff-grid">' + changes + '</div>' +
        '</article>';
      }).join("");

      document.getElementById("updates-table").innerHTML =
        '<div class="list">' + html + '</div>' +
        '<div style="padding:10px" class="muted">Showing ' + rows.length + ' of ' + visibleRows().length + ' matching update rows.</div>';

      document.querySelectorAll("[data-field-key]").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) selected.add(checkbox.dataset.fieldKey);
          else selected.delete(checkbox.dataset.fieldKey);
        });
      });
    }

    function setVisibleSelected(isSelected) {
      for (const row of visibleRows()) {
        for (const change of row.changes) {
          const key = fieldKey(row.id, change.column);
          if (isSelected) selected.add(key);
          else selected.delete(key);
        }
      }
      renderUpdates();
    }

    function generateSql() {
      const statements = [];
      for (const row of REVIEW_DATA.updateRows) {
        const selectedChanges = row.changes.filter((change) => selected.has(fieldKey(row.id, change.column)));
        if (selectedChanges.length === 0) continue;
        const assignments = selectedChanges.map((change) =>
          '"' + change.column + '" = ' + sqlValue(change.newValue)
        );
        if (row.sourceLastUpdated) {
          assignments.push('"last_updated" = ' + sqlValue(row.sourceLastUpdated));
        }
        assignments.push('"updatedAt" = CURRENT_TIMESTAMP');
        statements.push('UPDATE "V2AhsCultivar" SET ' + assignments.join(", ") + ' WHERE "id" = ' + sqlValue(row.id) + ';');
      }

      const sql = [
        "-- Generated by local V2 AHS refresh review page",
        "-- Selected field updates: " + selected.size,
        "BEGIN TRANSACTION;",
        ...statements,
        "COMMIT;",
        "",
      ].join("\\n");
      document.getElementById("sql-output").value = sql;
      showTab("sql");
    }

    document.getElementById("search").addEventListener("input", renderUpdates);
    document.getElementById("column-filter").addEventListener("change", renderUpdates);
    document.getElementById("select-visible").addEventListener("click", () => setVisibleSelected(true));
    document.getElementById("clear-visible").addEventListener("click", () => setVisibleSelected(false));
    document.getElementById("generate-sql").addEventListener("click", generateSql);
    document.getElementById("copy-sql").addEventListener("click", async () => {
      await navigator.clipboard.writeText(document.getElementById("sql-output").value);
    });

    renderNewRows();
    renderColumnFilter();
    renderUpdates();
  </script>
</body>
</html>
`;
}

function main() {
  const args = parseArgs();
  const summaryPath = path.join(args.deltaDir, "summary.json");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const reviewData = buildReviewData(summary);

  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.writeFileSync(args.output, buildHtml(reviewData), "utf8");

  console.log(`[v2-ahs-review] wrote ${args.output}`);
  console.log(`[v2-ahs-review] new rows ${reviewData.newRows.length}`);
  console.log(`[v2-ahs-review] update rows ${reviewData.updateRows.length}`);
}

main();
