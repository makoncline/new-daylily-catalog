import { execFileSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

const appRoot = process.cwd();
const scriptRoot = path.join(
  appRoot,
  "scripts/image-processing/v2-ahs-image-review",
);
const temporaryRoots: string[] = [];

function createWorkerEnv(
  temporaryRoot: string,
  overrides: NodeJS.ProcessEnv = {},
) {
  const authPath = path.join(temporaryRoot, "codex-auth.json");
  fs.writeFileSync(authPath, "{}");

  return {
    ...process.env,
    CODEX_AUTH_PATH: authPath,
    ...overrides,
  };
}

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

describe("Codex-native image worker", () => {
  it("refuses to recover queue rows while another worker is running", () => {
    const temporaryRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "codex-native-worker-lock-"),
    );
    temporaryRoots.push(temporaryRoot);

    const dataRoot = path.join(temporaryRoot, "data");
    const reviewRoot = path.join(dataRoot, "v2-ahs-image-review");
    fs.mkdirSync(reviewRoot, { recursive: true });
    fs.writeFileSync(
      path.join(reviewRoot, "codex-native-worker.lock"),
      JSON.stringify({
        pid: process.pid,
        runId: "active-test-worker",
        startedAt: new Date().toISOString(),
      }),
    );

    const result = spawnSync(
      process.execPath,
      [path.join(scriptRoot, "run-codex-native-worker.mjs"), "--limit", "1"],
      {
        encoding: "utf8",
        env: createWorkerEnv(temporaryRoot, {
          CODEX_USAGE_CHECK_DISABLED: "1",
          V2_AHS_IMAGE_REVIEW_DATA_ROOT: dataRoot,
        }),
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `Another image worker is already running pid=${process.pid} run=active-test-worker`,
    );
    expect(
      fs.existsSync(path.join(reviewRoot, "codex-native-worker.lock")),
    ).toBe(true);
  });

  it("keeps concurrent queue rows mapped and promotes without lock failures", () => {
    const temporaryRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "codex-native-worker-"),
    );
    temporaryRoots.push(temporaryRoot);

    const dataRoot = path.join(temporaryRoot, "data");
    const reviewRoot = path.join(dataRoot, "v2-ahs-image-review");
    const originalsRoot = path.join(dataRoot, "v2-ahs-images");
    const generatedRoot = path.join(temporaryRoot, "generated");
    const databasePath = path.join(reviewRoot, "review.sqlite");
    const fakeCodexPath = path.join(temporaryRoot, "fake-codex.mjs");
    const relativeDataRoot = path.relative(appRoot, dataRoot);

    fs.mkdirSync(reviewRoot, { recursive: true });
    fs.mkdirSync(originalsRoot, { recursive: true });
    const ids = Array.from({ length: 9 }, (_, index) => `item-${index + 1}`);
    for (const id of ids) {
      fs.writeFileSync(path.join(originalsRoot, `${id}.jpg`), `${id}-source`);
    }
    fs.writeFileSync(
      path.join(originalsRoot, "stranded.jpg"),
      "stranded-source",
    );
    fs.mkdirSync(path.join(generatedRoot, "session-recovered"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(generatedRoot, "session-recovered", "result.png"),
      "recovered-output",
    );
    fs.writeFileSync(
      fakeCodexPath,
      `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const imageIndex = process.argv.indexOf("-i");
const sourcePath = process.argv[imageIndex + 1];
const id = path.parse(sourcePath).name;
const sessionId = \`session-\${id}\`;
const disabledFeatures = process.argv.flatMap((arg, index, args) =>
  arg === "--disable" ? [args[index + 1]] : [],
);
for (const requiredArg of ["--ignore-user-config", "--ignore-rules"]) {
  if (!process.argv.includes(requiredArg)) {
    throw new Error(\`Missing clean-session argument: \${requiredArg}\`);
  }
}
for (const config of [
  "skills.bundled.enabled=false",
  "skills.include_instructions=false",
]) {
  if (!process.argv.includes(config)) {
    throw new Error(\`Missing clean-session config: \${config}\`);
  }
}
for (const feature of ["apps", "chronicle", "memories", "plugins"]) {
  if (!disabledFeatures.includes(feature)) {
    throw new Error(\`Feature was not disabled: \${feature}\`);
  }
}
const imageGenerationIndex = process.argv.indexOf("--enable");
if (process.argv[imageGenerationIndex + 1] !== "image_generation") {
  throw new Error("Image generation was not explicitly enabled");
}
const dataRoot = path.resolve(process.env.V2_AHS_IMAGE_REVIEW_DATA_ROOT);
if (!process.env.CODEX_HOME?.startsWith(dataRoot)) {
  throw new Error("Codex home is not inside the shared image-processing root");
}
console.log(JSON.stringify({ type: "thread.started", thread_id: sessionId }));
await new Promise((resolve) => setTimeout(resolve, 20));
const outputDir = path.join(process.env.CODEX_GENERATED_IMAGES_ROOT, sessionId);
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "result.png"), \`\${id}-output\`);
console.log(JSON.stringify({
  type: "turn.completed",
  usage: {
    input_tokens: 100,
    cached_input_tokens: 80,
    output_tokens: 10,
    reasoning_output_tokens: 5,
  },
}));
`,
    );
    fs.chmodSync(fakeCodexPath, 0o755);

    const database = new DatabaseSync(databasePath);
    database.exec(`
      CREATE TABLE "v2_image_review_queue" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "postTitle" TEXT,
        "originalPath" TEXT NOT NULL,
        "editedPath" TEXT,
        "status" TEXT NOT NULL,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "lastError" TEXT,
        "promptVersion" TEXT,
        "codexNativeAgentId" TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      );
    `);
    const insert = database.prepare(`
      INSERT INTO "v2_image_review_queue" (
        "id", "postTitle", "originalPath", "status", "codexNativeAgentId",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, 'pending', NULL, ?, ?)
    `);
    for (const [index, id] of ids.entries()) {
      insert.run(
        id,
        id,
        path.join(originalsRoot, `${id}.jpg`),
        `2026-01-${String(index + 1).padStart(2, "0")}`,
        `2026-01-${String(index + 1).padStart(2, "0")}`,
      );
    }
    database
      .prepare(
        `
          INSERT INTO "v2_image_review_queue" (
            "id", "postTitle", "originalPath", "status", "codexNativeAgentId",
            "createdAt", "updatedAt"
          ) VALUES (?, ?, ?, 'processing', 'session-recovered', ?, ?)
        `,
      )
      .run(
        "recovered",
        "Recovered",
        path.join(originalsRoot, "item-1.jpg"),
        "2026-01-03",
        "2026-01-03",
      );
    database
      .prepare(
        `
          INSERT INTO "v2_image_review_queue" (
            "id", "postTitle", "originalPath", "status", "codexNativeAgentId",
            "createdAt", "updatedAt"
          ) VALUES (?, ?, ?, 'processing', NULL, ?, ?)
        `,
      )
      .run(
        "stranded",
        "Stranded",
        path.join(originalsRoot, "stranded.jpg"),
        "2026-01-04",
        "2026-01-04",
      );
    database.close();

    execFileSync(
      process.execPath,
      [
        path.join(scriptRoot, "run-codex-native-worker.mjs"),
        "--limit",
        "10",
        "--concurrency",
        "10",
        "--timeout-minutes",
        "1",
      ],
      {
        env: createWorkerEnv(temporaryRoot, {
          CODEX_BIN: fakeCodexPath,
          CODEX_GENERATED_IMAGES_ROOT: generatedRoot,
          CODEX_USAGE_CHECK_DISABLED: "1",
          V2_AHS_IMAGE_REVIEW_DATA_ROOT: relativeDataRoot,
        }),
      },
    );

    for (const id of ids) {
      expect(
        fs.readFileSync(path.join(reviewRoot, "edited", `${id}.png`), "utf8"),
      ).toBe(`${id}-output`);
    }
    expect(
      fs.readFileSync(path.join(reviewRoot, "edited", "recovered.png"), "utf8"),
    ).toBe("recovered-output");

    const verifiedDatabase = new DatabaseSync(databasePath, {
      readOnly: true,
    });
    const rows = verifiedDatabase
      .prepare(
        `
          SELECT "id", "status", "codexNativeAgentId"
          FROM "v2_image_review_queue"
          ORDER BY "id"
        `,
      )
      .all();
    verifiedDatabase.close();

    expect(rows).toHaveLength(11);
    expect(rows).toContainEqual({
      id: "recovered",
      status: "review",
      codexNativeAgentId: "session-recovered",
    });
    expect(rows).toContainEqual({
      id: "stranded",
      status: "review",
      codexNativeAgentId: "session-stranded",
    });
    for (const id of ids) {
      expect(rows).toContainEqual({
        id,
        status: "review",
        codexNativeAgentId: `session-${id}`,
      });
    }

    const runFiles = fs.readdirSync(path.join(reviewRoot, "codex-native-runs"));
    const runLog = fs.readFileSync(
      path.join(
        reviewRoot,
        "codex-native-runs",
        runFiles.find((file) => file.endsWith(".log"))!,
      ),
      "utf8",
    );
    expect(runLog).toContain("success=10/10 (100.0%)");
    expect(runLog).toContain("worker finished attempted=10 completed=10");
    expect(runLog).toContain("promoted=yes status=review");
    expect(runLog).toContain(
      "usageSamples=10 tokensInput=1000 tokensCached=800 tokensOutput=100 tokensReasoning=50",
    );
    expect(runLog).toContain("queue initial pending=9 processing=2");
    expect(runLog).toContain("queue afterRecovery pending=10 review=1");
    expect(runLog).toContain("queue finish review=11");
    expect(runLog).toContain(`paths reviewRoot=${reviewRoot}`);
    expect(runLog).toContain(
      `codexHome=${path.join(reviewRoot, "codex-image-home")}`,
    );
    expect(runFiles.some((file) => file.endsWith(".events.jsonl"))).toBe(true);
  });

  it("reports total account usage from startup through completion", () => {
    const temporaryRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "codex-native-worker-usage-"),
    );
    temporaryRoots.push(temporaryRoot);

    const dataRoot = path.join(temporaryRoot, "data");
    const reviewRoot = path.join(dataRoot, "v2-ahs-image-review");
    const originalsRoot = path.join(dataRoot, "v2-ahs-images");
    const generatedRoot = path.join(temporaryRoot, "generated");
    const databasePath = path.join(reviewRoot, "review.sqlite");
    const fakeCodexPath = path.join(temporaryRoot, "fake-codex.mjs");
    const usageCounterPath = path.join(temporaryRoot, "usage-counter");

    fs.mkdirSync(reviewRoot, { recursive: true });
    fs.mkdirSync(originalsRoot, { recursive: true });
    fs.writeFileSync(path.join(originalsRoot, "usage.jpg"), "source");
    fs.writeFileSync(
      fakeCodexPath,
      `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

if (process.argv.includes("app-server")) {
  const counterPath = ${JSON.stringify(usageCounterPath)};
  const sampleIndex = fs.existsSync(counterPath)
    ? Number(fs.readFileSync(counterPath, "utf8"))
    : 0;
  fs.writeFileSync(counterPath, String(sampleIndex + 1));
  const usedPercent = sampleIndex === 0 ? 10 : 13;
  const lifetimeTokens = sampleIndex === 0 ? 1_000 : 1_300;
  const input = readline.createInterface({ input: process.stdin });
  input.on("line", (line) => {
    const request = JSON.parse(line);
    if (request.id === 1) {
      console.log(JSON.stringify({ id: 1, result: {} }));
    } else if (request.id === 2) {
      console.log(JSON.stringify({
        id: 2,
        result: {
          rateLimits: {
            primary: {
              usedPercent,
              windowDurationMins: 10_080,
              resetsAt: 1_800_000_000,
            },
          },
          rateLimitResetCredits: { availableCount: 3 },
        },
      }));
    } else if (request.id === 3) {
      console.log(JSON.stringify({
        id: 3,
        result: { summary: { lifetimeTokens } },
      }));
    }
  });
} else {
  const imageIndex = process.argv.indexOf("-i");
  const id = path.parse(process.argv[imageIndex + 1]).name;
  const sessionId = \`session-\${id}\`;
  console.log(JSON.stringify({ type: "thread.started", thread_id: sessionId }));
  const outputDir = path.join(process.env.CODEX_GENERATED_IMAGES_ROOT, sessionId);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "result.png"), "output");
  console.log(JSON.stringify({
    type: "turn.completed",
    usage: {
      input_tokens: 100,
      cached_input_tokens: 80,
      output_tokens: 10,
      reasoning_output_tokens: 5,
    },
  }));
}
`,
    );
    fs.chmodSync(fakeCodexPath, 0o755);

    const database = new DatabaseSync(databasePath);
    database.exec(`
      CREATE TABLE "v2_image_review_queue" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "postTitle" TEXT,
        "originalPath" TEXT NOT NULL,
        "editedPath" TEXT,
        "status" TEXT NOT NULL,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "lastError" TEXT,
        "promptVersion" TEXT,
        "codexNativeAgentId" TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      );
    `);
    database
      .prepare(
        `
          INSERT INTO "v2_image_review_queue" (
            "id", "postTitle", "originalPath", "status", "createdAt", "updatedAt"
          ) VALUES (?, ?, ?, 'pending', ?, ?)
        `,
      )
      .run(
        "usage",
        "Usage",
        path.join(originalsRoot, "usage.jpg"),
        "2026-01-01",
        "2026-01-01",
      );
    database.close();

    execFileSync(
      process.execPath,
      [
        path.join(scriptRoot, "run-codex-native-worker.mjs"),
        "--id",
        "usage",
        "--timeout-minutes",
        "1",
      ],
      {
        env: createWorkerEnv(temporaryRoot, {
          CODEX_BIN: fakeCodexPath,
          CODEX_GENERATED_IMAGES_ROOT: generatedRoot,
          V2_AHS_IMAGE_REVIEW_DATA_ROOT: dataRoot,
        }),
      },
    );

    const runDirectory = path.join(reviewRoot, "codex-native-runs");
    const runLog = fs.readFileSync(
      path.join(
        runDirectory,
        fs.readdirSync(runDirectory).find((file) => file.endsWith(".log"))!,
      ),
      "utf8",
    );
    expect(runLog).toContain(
      "codex usage label=start usedPercent=10 remainingPercent=90",
    );
    expect(runLog).toContain(
      "codex usage label=finish usedPercent=13 remainingPercent=87",
    );
    expect(runLog).toContain(
      "codex usage run baselineLabel=start baselineUsedPercent=10 finishUsedPercent=13 accountWideDeltaUsedPercent=3",
    );
    expect(runLog).toContain("accountWideDeltaTokens=300");
  });

  it("prefetches catchup and backlog work while the queue stays active", () => {
    const temporaryRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "codex-native-backlog-worker-"),
    );
    temporaryRoots.push(temporaryRoot);

    const dataRoot = path.join(temporaryRoot, "data");
    const reviewRoot = path.join(dataRoot, "v2-ahs-image-review");
    const originalsRoot = path.join(dataRoot, "v2-ahs-images");
    const generatedRoot = path.join(temporaryRoot, "generated");
    const databasePath = path.join(reviewRoot, "review.sqlite");
    const prodDatabasePath = path.join(temporaryRoot, "prod.sqlite");
    const fakeCodexPath = path.join(temporaryRoot, "fake-codex.mjs");
    const fakeBacklogPath = path.join(temporaryRoot, "fake-backlog.mjs");

    fs.mkdirSync(reviewRoot, { recursive: true });
    fs.mkdirSync(originalsRoot, { recursive: true });
    fs.writeFileSync(path.join(originalsRoot, "linked.jpg"), "linked-source");
    fs.writeFileSync(path.join(originalsRoot, "failed.jpg"), "failed-source");
    fs.writeFileSync(path.join(originalsRoot, "catchup.jpg"), "catchup-source");
    fs.writeFileSync(path.join(originalsRoot, "backlog.jpg"), "backlog-source");

    fs.writeFileSync(
      fakeCodexPath,
      `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const imageIndex = process.argv.indexOf("-i");
const id = path.parse(process.argv[imageIndex + 1]).name;
const sessionId = \`session-\${id}\`;
console.log(JSON.stringify({ type: "thread.started", thread_id: sessionId }));
await new Promise((resolve) => setTimeout(resolve, id === "linked" ? 300 : 20));
const outputDir = path.join(process.env.CODEX_GENERATED_IMAGES_ROOT, sessionId);
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "result.png"), \`\${id}-output\`);
`,
    );
    fs.chmodSync(fakeCodexPath, 0o755);

    fs.writeFileSync(
      fakeBacklogPath,
      `#!/usr/bin/env node
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const reviewRoot = path.join(
  process.env.V2_AHS_IMAGE_REVIEW_DATA_ROOT,
  "v2-ahs-image-review",
);
const database = new DatabaseSync(path.join(reviewRoot, "review.sqlite"));
const modeIndex = process.argv.indexOf("--mode");
const mode = process.argv[modeIndex + 1];
const linked = database
  .prepare('SELECT "status" FROM "v2_image_review_queue" WHERE "id" = ?')
  .get("linked");
if (!['processing', 'review'].includes(linked?.status)) {
  throw new Error("Source discovery ran before the existing queue started");
}
if (mode === "backlog") {
  const catchup = database
    .prepare('SELECT "status" FROM "v2_image_review_queue" WHERE "id" = ?')
    .get("catchup");
  if (!['processing', 'review'].includes(catchup?.status)) {
    throw new Error("Backlog selected before catchup started");
  }
}
const id = mode === "catchup" ? "catchup" : "backlog";
const now = new Date().toISOString();
database.prepare(\`
  INSERT INTO "v2_image_review_queue" (
    "id", "postTitle", "originalPath", "status", "attempts",
    "createdAt", "updatedAt"
  ) VALUES (?, ?, ?, 'pending', 0, ?, ?)
\`).run(
  id,
  id === "catchup" ? "Catchup" : "Backlog",
  path.join(process.env.V2_AHS_IMAGE_REVIEW_DATA_ROOT, "v2-ahs-images", \`\${id}.jpg\`),
  now,
  now,
);
database.close();
`,
    );
    fs.chmodSync(fakeBacklogPath, 0o755);

    const database = new DatabaseSync(databasePath);
    database.exec(`
      CREATE TABLE "v2_image_review_queue" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "postTitle" TEXT,
        "originalPath" TEXT NOT NULL,
        "editedPath" TEXT,
        "status" TEXT NOT NULL,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "lastError" TEXT,
        "promptVersion" TEXT,
        "codexNativeAgentId" TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      );
    `);
    database
      .prepare(
        `
          INSERT INTO "v2_image_review_queue" (
            "id", "postTitle", "originalPath", "status", "attempts",
            "createdAt", "updatedAt"
          ) VALUES (?, ?, ?, 'pending', 0, ?, ?)
        `,
      )
      .run(
        "linked",
        "Linked",
        path.join(originalsRoot, "linked.jpg"),
        "2026-01-01",
        "2026-01-01",
      );
    database
      .prepare(
        `
          INSERT INTO "v2_image_review_queue" (
            "id", "postTitle", "originalPath", "status", "attempts",
            "createdAt", "updatedAt"
          ) VALUES (?, ?, ?, 'failed', 1, ?, ?)
        `,
      )
      .run(
        "failed",
        "Failed",
        path.join(originalsRoot, "failed.jpg"),
        "2026-01-01",
        "2026-01-01",
      );
    database.close();

    const prodDatabase = new DatabaseSync(prodDatabasePath);
    prodDatabase.exec(`
      CREATE TABLE "Listing" ("cultivarReferenceId" TEXT);
      INSERT INTO "Listing" VALUES ('linked');
    `);
    prodDatabase.close();

    execFileSync(
      process.execPath,
      [
        path.join(scriptRoot, "run-codex-native-worker.mjs"),
        "--limit",
        "3",
        "--concurrency",
        "2",
        "--timeout-minutes",
        "1",
      ],
      {
        env: createWorkerEnv(temporaryRoot, {
          CODEX_BACKLOG_SCRIPT: fakeBacklogPath,
          CODEX_BIN: fakeCodexPath,
          CODEX_GENERATED_IMAGES_ROOT: generatedRoot,
          CODEX_USAGE_CHECK_DISABLED: "1",
          V2_AHS_IMAGE_REVIEW_DATA_ROOT: dataRoot,
          V2_AHS_PROD_COPY_DB_PATH: prodDatabasePath,
        }),
      },
    );

    const verifiedDatabase = new DatabaseSync(databasePath, {
      readOnly: true,
    });
    const rows = verifiedDatabase
      .prepare(
        `SELECT "id", "status" FROM "v2_image_review_queue" ORDER BY "id"`,
      )
      .all();
    verifiedDatabase.close();

    expect(rows).toEqual([
      { id: "backlog", status: "review" },
      { id: "catchup", status: "review" },
      { id: "failed", status: "failed" },
      { id: "linked", status: "review" },
    ]);

    const runDirectory = path.join(reviewRoot, "codex-native-runs");
    const runLog = fs.readFileSync(
      path.join(
        runDirectory,
        fs.readdirSync(runDirectory).find((file) => file.endsWith(".log"))!,
      ),
      "utf8",
    );
    expect(runLog.indexOf("started id=catchup")).toBeLessThan(
      runLog.indexOf("thread finished id=linked"),
    );
  });

  it("summarizes a no-image failure without failing the batch", () => {
    const temporaryRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "codex-native-no-image-"),
    );
    temporaryRoots.push(temporaryRoot);

    const dataRoot = path.join(temporaryRoot, "data");
    const reviewRoot = path.join(dataRoot, "v2-ahs-image-review");
    const originalsRoot = path.join(dataRoot, "v2-ahs-images");
    const databasePath = path.join(reviewRoot, "review.sqlite");
    const fakeCodexPath = path.join(temporaryRoot, "fake-codex.mjs");

    fs.mkdirSync(reviewRoot, { recursive: true });
    fs.mkdirSync(originalsRoot, { recursive: true });
    fs.writeFileSync(path.join(originalsRoot, "no-image.jpg"), "source");
    fs.writeFileSync(
      fakeCodexPath,
      `#!/usr/bin/env node
console.log(JSON.stringify({ type: "thread.started", thread_id: "session-no-image" }));
console.log(JSON.stringify({
  type: "item.completed",
  item: { type: "agent_message", text: "I could not create this image." }
}));
`,
    );
    fs.chmodSync(fakeCodexPath, 0o755);

    const database = new DatabaseSync(databasePath);
    database.exec(`
      CREATE TABLE "v2_image_review_queue" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "postTitle" TEXT,
        "originalPath" TEXT NOT NULL,
        "editedPath" TEXT,
        "status" TEXT NOT NULL,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "lastError" TEXT,
        "promptVersion" TEXT,
        "codexNativeAgentId" TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      );
      INSERT INTO "v2_image_review_queue" (
        "id", "postTitle", "originalPath", "status", "createdAt", "updatedAt"
      ) VALUES (
        'no-image', 'No Image', '${path.join(originalsRoot, "no-image.jpg")}',
        'pending', '2026-01-01', '2026-01-01'
      );
    `);
    database.close();

    const result = spawnSync(
      process.execPath,
      [
        path.join(scriptRoot, "run-codex-native-worker.mjs"),
        "--id",
        "no-image",
        "--timeout-minutes",
        "1",
      ],
      {
        encoding: "utf8",
        env: createWorkerEnv(temporaryRoot, {
          CODEX_BIN: fakeCodexPath,
          CODEX_USAGE_CHECK_DISABLED: "1",
          V2_AHS_IMAGE_REVIEW_DATA_ROOT: dataRoot,
        }),
      },
    );

    expect(result.status).toBe(0);
    const runDirectory = path.join(reviewRoot, "codex-native-runs");
    const runFiles = fs.readdirSync(runDirectory);
    const runLog = fs.readFileSync(
      path.join(runDirectory, runFiles.find((file) => file.endsWith(".log"))!),
      "utf8",
    );
    expect(runLog).toContain("image=no");
    expect(runLog).toContain(
      "no-image response id=no-image: I could not create this image.",
    );
    expect(runLog).toContain("success=0/1 (0.0%)");
    expect(runLog).toContain(
      "worker finished attempted=1 completed=1 promoted=0",
    );
    expect(runLog).toContain(
      "failed=1 interrupted=0 stopReason=limit reached successRate=0.0%",
    );

    const events = fs
      .readFileSync(
        path.join(
          runDirectory,
          runFiles.find((file) => file.endsWith(".events.jsonl"))!,
        ),
        "utf8",
      )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(events).toContainEqual(
      expect.objectContaining({
        queueId: "no-image",
        event: expect.objectContaining({ type: "item.completed" }),
      }),
    );
  });

  it("changes concurrency live and drains without interrupting active work", async () => {
    const temporaryRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "codex-native-control-"),
    );
    temporaryRoots.push(temporaryRoot);

    const dataRoot = path.join(temporaryRoot, "data");
    const reviewRoot = path.join(dataRoot, "v2-ahs-image-review");
    const originalsRoot = path.join(dataRoot, "v2-ahs-images");
    const generatedRoot = path.join(temporaryRoot, "generated");
    const databasePath = path.join(reviewRoot, "review.sqlite");
    const fakeCodexPath = path.join(temporaryRoot, "fake-codex.mjs");
    const fakeBacklogPath = path.join(temporaryRoot, "fake-backlog.mjs");
    const statePath = path.join(reviewRoot, "codex-native-worker-state.json");

    fs.mkdirSync(reviewRoot, { recursive: true });
    fs.mkdirSync(originalsRoot, { recursive: true });
    for (let index = 1; index <= 8; index += 1) {
      fs.writeFileSync(
        path.join(originalsRoot, `control-${index}.jpg`),
        "source",
      );
    }
    fs.writeFileSync(
      fakeCodexPath,
      `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const imageIndex = process.argv.indexOf("-i");
const id = path.parse(process.argv[imageIndex + 1]).name;
const sessionId = \`session-\${id}\`;
console.log(JSON.stringify({ type: "thread.started", thread_id: sessionId }));
await new Promise((resolve) => setTimeout(resolve, 1_500));
const outputDir = path.join(process.env.CODEX_GENERATED_IMAGES_ROOT, sessionId);
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "result.png"), "output");
`,
    );
    fs.chmodSync(fakeCodexPath, 0o755);
    fs.writeFileSync(
      fakeBacklogPath,
      `#!/usr/bin/env node
const mode = process.argv[process.argv.indexOf("--mode") + 1];
console.log(\`[v2-image-queue] mode=\${mode} selected=0\`);
`,
    );
    fs.chmodSync(fakeBacklogPath, 0o755);

    const database = new DatabaseSync(databasePath);
    database.exec(`
      CREATE TABLE "v2_image_review_queue" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "postTitle" TEXT,
        "originalPath" TEXT NOT NULL,
        "editedPath" TEXT,
        "status" TEXT NOT NULL,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "lastError" TEXT,
        "promptVersion" TEXT,
        "codexNativeAgentId" TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      );
    `);
    const insert = database.prepare(`
      INSERT INTO "v2_image_review_queue" (
        "id", "postTitle", "originalPath", "status", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, 'pending', ?, ?)
    `);
    for (let index = 1; index <= 8; index += 1) {
      insert.run(
        `control-${index}`,
        `Control ${index}`,
        path.join(originalsRoot, `control-${index}.jpg`),
        `2026-01-0${index}`,
        `2026-01-0${index}`,
      );
    }
    database.close();

    const env = createWorkerEnv(temporaryRoot, {
      CODEX_BACKLOG_SCRIPT: fakeBacklogPath,
      CODEX_BIN: fakeCodexPath,
      CODEX_GENERATED_IMAGES_ROOT: generatedRoot,
      CODEX_USAGE_CHECK_DISABLED: "1",
      V2_AHS_IMAGE_REVIEW_DATA_ROOT: dataRoot,
    });
    const worker = spawn(
      process.execPath,
      [
        path.join(scriptRoot, "run-codex-native-worker.mjs"),
        "--limit",
        "8",
        "--concurrency",
        "1",
        "--timeout-minutes",
        "1",
      ],
      { env, stdio: ["ignore", "pipe", "pipe"] },
    );

    const waitForState = async (predicate: (state: any) => boolean) => {
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        if (fs.existsSync(statePath)) {
          const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
          if (predicate(state)) return state;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      throw new Error("Timed out waiting for worker state");
    };

    await waitForState(
      (state) => state.desiredConcurrency === 1 && state.active === 1,
    );
    execFileSync(
      process.execPath,
      [
        path.join(scriptRoot, "control-codex-native-worker.mjs"),
        "concurrency",
        "3",
      ],
      { env },
    );
    await waitForState(
      (state) => state.desiredConcurrency === 3 && state.active === 3,
    );
    execFileSync(
      process.execPath,
      [path.join(scriptRoot, "control-codex-native-worker.mjs"), "drain"],
      { env },
    );

    const exitCode = await new Promise<number | null>((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.kill("SIGKILL");
        reject(new Error("Timed out waiting for worker drain"));
      }, 10_000);
      worker.once("error", reject);
      worker.once("close", (code) => {
        clearTimeout(timeout);
        resolve(code);
      });
    });
    expect(exitCode).toBe(0);

    const verifiedDatabase = new DatabaseSync(databasePath, { readOnly: true });
    const statuses = verifiedDatabase
      .prepare(
        `SELECT "status", COUNT(*) AS "count" FROM "v2_image_review_queue" GROUP BY "status" ORDER BY "status"`,
      )
      .all();
    verifiedDatabase.close();
    expect(statuses).toEqual([
      { status: "pending", count: 5 },
      { status: "review", count: 3 },
    ]);

    const runDirectory = path.join(reviewRoot, "codex-native-runs");
    const runLog = fs.readFileSync(
      path.join(
        runDirectory,
        fs.readdirSync(runDirectory).find((file) => file.endsWith(".log"))!,
      ),
      "utf8",
    );
    expect(runLog).toContain(
      "concurrency changed previous=1 desired=3 active=1",
    );
    expect(runLog).toContain("draining reason=control command active=3");
    expect(runLog).toContain("promoted=3");
    expect(runLog).toContain("interrupted=0");
  });

  it("returns an interrupted thread to pending without counting a failure", async () => {
    const temporaryRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "codex-native-interrupted-"),
    );
    temporaryRoots.push(temporaryRoot);

    const dataRoot = path.join(temporaryRoot, "data");
    const reviewRoot = path.join(dataRoot, "v2-ahs-image-review");
    const originalsRoot = path.join(dataRoot, "v2-ahs-images");
    const databasePath = path.join(reviewRoot, "review.sqlite");
    const fakeCodexPath = path.join(temporaryRoot, "fake-codex.mjs");

    fs.mkdirSync(reviewRoot, { recursive: true });
    fs.mkdirSync(originalsRoot, { recursive: true });
    fs.writeFileSync(path.join(originalsRoot, "interrupted.jpg"), "source");
    fs.writeFileSync(
      fakeCodexPath,
      `#!/usr/bin/env node
console.log(JSON.stringify({ type: "thread.started", thread_id: "session-interrupted" }));
setInterval(() => {}, 1_000);
`,
    );
    fs.chmodSync(fakeCodexPath, 0o755);

    const database = new DatabaseSync(databasePath);
    database.exec(`
      CREATE TABLE "v2_image_review_queue" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "postTitle" TEXT,
        "originalPath" TEXT NOT NULL,
        "editedPath" TEXT,
        "status" TEXT NOT NULL,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "lastError" TEXT,
        "promptVersion" TEXT,
        "codexNativeAgentId" TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      );
    `);
    database
      .prepare(
        `
          INSERT INTO "v2_image_review_queue" (
            "id", "postTitle", "originalPath", "status", "createdAt", "updatedAt"
          ) VALUES (?, ?, ?, 'pending', ?, ?)
        `,
      )
      .run(
        "interrupted",
        "Interrupted",
        path.join(originalsRoot, "interrupted.jpg"),
        "2026-01-01",
        "2026-01-01",
      );
    database.close();

    const worker = spawn(
      process.execPath,
      [
        path.join(scriptRoot, "run-codex-native-worker.mjs"),
        "--id",
        "interrupted",
        "--timeout-minutes",
        "1",
      ],
      {
        env: createWorkerEnv(temporaryRoot, {
          CODEX_BIN: fakeCodexPath,
          CODEX_USAGE_CHECK_DISABLED: "1",
          V2_AHS_IMAGE_REVIEW_DATA_ROOT: dataRoot,
        }),
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let sentInterrupt = false;
    const exitCode = await new Promise<number | null>((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.kill("SIGKILL");
        reject(new Error("Timed out waiting to interrupt worker"));
      }, 10_000);

      worker.stdout.setEncoding("utf8");
      worker.stdout.on("data", (chunk) => {
        stdout += chunk;
        if (!sentInterrupt && stdout.includes("assigned id=interrupted")) {
          sentInterrupt = true;
          worker.kill("SIGINT");
        }
      });
      worker.once("error", reject);
      worker.once("close", (code) => {
        clearTimeout(timeout);
        resolve(code);
      });
    });

    expect(exitCode).toBe(0);

    const verifiedDatabase = new DatabaseSync(databasePath, { readOnly: true });
    const row = verifiedDatabase
      .prepare(
        `
          SELECT "status", "lastError", "codexNativeAgentId"
          FROM "v2_image_review_queue"
          WHERE "id" = 'interrupted'
        `,
      )
      .get();
    verifiedDatabase.close();

    expect(row).toEqual({
      status: "pending",
      lastError: "Worker interrupted by SIGINT",
      codexNativeAgentId: null,
    });

    const runDirectory = path.join(reviewRoot, "codex-native-runs");
    const runLogPath = fs
      .readdirSync(runDirectory)
      .map((file) => path.join(runDirectory, file))
      .find((file) => file.endsWith(".log"))!;
    const runLog = fs.readFileSync(runLogPath, "utf8");
    expect(runLog).toContain("stopping signal=SIGINT active=1");
    expect(runLog).toContain(
      "thread interrupted id=interrupted session=session-interrupted signal=SIGINT status=pending",
    );
    expect(runLog).toContain("failed=0 interrupted=1");
    expect(runLog).not.toContain("no-image response id=interrupted");
  });
});
