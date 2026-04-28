import fs from "node:fs";
import path from "node:path";
import {
  buildQueryProfilerReport,
  parseQueryProfilerEvents,
  renderQueryProfilerMarkdown,
} from "@/server/db/query-profiler-report";

interface QueryProfilerCliOptions {
  inputPath: string;
  outputPath: string;
  jsonPath: string;
  top: number;
  focusNeedle: string;
  eventType: "auto" | "sql" | "operation";
}

const DEFAULT_INPUT_PATH = "tests/.tmp/query-profiler/prisma-query-events.jsonl";
const DEFAULT_MARKDOWN_OUTPUT_PATH = "tests/.tmp/query-profiler/query-report.md";
const DEFAULT_JSON_OUTPUT_PATH = "tests/.tmp/query-profiler/query-report.json";
const DEFAULT_TOP_LIMIT = 30;
const DEFAULT_FOCUS_NEEDLE = "cultivar";
const DEFAULT_EVENT_TYPE = "auto";

function readFlagValue(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function parseTopLimit(rawValue: string | undefined) {
  if (!rawValue) {
    return DEFAULT_TOP_LIMIT;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`[query-profiler] Invalid --top value: ${rawValue}`);
  }

  return parsed;
}

function resolveCliOptions(): QueryProfilerCliOptions {
  const inputPath =
    readFlagValue("--input") ??
    process.env.LOCAL_QUERY_PROFILER_OUTPUT ??
    DEFAULT_INPUT_PATH;
  const outputPath = readFlagValue("--output") ?? DEFAULT_MARKDOWN_OUTPUT_PATH;
  const jsonPath = readFlagValue("--json") ?? DEFAULT_JSON_OUTPUT_PATH;
  const top = parseTopLimit(readFlagValue("--top"));
  const focusNeedle = readFlagValue("--focus") ?? DEFAULT_FOCUS_NEEDLE;
  const eventTypeRaw = readFlagValue("--event-type") ?? DEFAULT_EVENT_TYPE;
  if (
    eventTypeRaw !== "auto" &&
    eventTypeRaw !== "sql" &&
    eventTypeRaw !== "operation"
  ) {
    throw new Error(
      `[query-profiler] Invalid --event-type value: ${eventTypeRaw}`,
    );
  }

  return {
    inputPath: path.resolve(process.cwd(), inputPath),
    outputPath: path.resolve(process.cwd(), outputPath),
    jsonPath: path.resolve(process.cwd(), jsonPath),
    top,
    focusNeedle,
    eventType: eventTypeRaw,
  };
}

function ensureParentDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function main() {
  const options = resolveCliOptions();

  if (!fs.existsSync(options.inputPath)) {
    throw new Error(
      `[query-profiler] Input file not found: ${path.relative(process.cwd(), options.inputPath)}`,
    );
  }

  const raw = fs.readFileSync(options.inputPath, "utf8");
  const events = parseQueryProfilerEvents(raw);
  const report = buildQueryProfilerReport(events, {
    top: options.top,
    focusNeedle: options.focusNeedle,
    eventType: options.eventType,
  });

  const markdown = renderQueryProfilerMarkdown(report, {
    sourcePath: path.relative(process.cwd(), options.inputPath),
    focusNeedle: options.focusNeedle,
  });

  ensureParentDir(options.outputPath);
  ensureParentDir(options.jsonPath);
  fs.writeFileSync(options.outputPath, markdown, "utf8");
  fs.writeFileSync(options.jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("[query-profiler] Report generated");
  console.log(
    `[query-profiler] markdown: ${path.relative(process.cwd(), options.outputPath)}`,
  );
  console.log(
    `[query-profiler] json: ${path.relative(process.cwd(), options.jsonPath)}`,
  );
}

main();
