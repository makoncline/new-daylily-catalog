import { createHash } from "node:crypto";
import { type PrismaQueryProfilerEvent } from "./local-query-profiler";

const WHITESPACE_REGEX = /\s+/g;

export interface QueryPatternMetrics {
  fingerprint: string;
  sqlPattern: string;
  count: number;
  totalTimeMs: number;
  avgTimeMs: number;
  p95TimeMs: number;
  maxTimeMs: number;
}

export interface QueryProfilerReport {
  eventType: PrismaQueryProfilerEvent["eventType"];
  eventCount: number;
  uniquePatternCount: number;
  totalTimeMs: number;
  patterns: QueryPatternMetrics[];
  focusPatterns: QueryPatternMetrics[];
}

interface BuildQueryProfilerReportOptions {
  top: number;
  focusNeedle: string | null;
  eventType: "auto" | PrismaQueryProfilerEvent["eventType"];
}

interface MutableQueryPatternMetrics {
  sqlPattern: string;
  durationsMs: number[];
  count: number;
  totalTimeMs: number;
  maxTimeMs: number;
}

const DEFAULT_REPORT_OPTIONS: BuildQueryProfilerReportOptions = {
  top: 30,
  focusNeedle: "cultivar",
  eventType: "auto",
};

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

export function normalizeSqlPattern(query: string) {
  return query.replace(WHITESPACE_REGEX, " ").trim();
}

function getPatternFingerprint(sqlPattern: string) {
  return createHash("sha1").update(sqlPattern).digest("hex").slice(0, 12);
}

function computePercentile(durationsMs: number[], percentile: number) {
  if (durationsMs.length === 0) {
    return 0;
  }

  const sorted = [...durationsMs].sort((a, b) => a - b);
  const rawIndex = Math.ceil(sorted.length * percentile) - 1;
  const index = Math.max(0, Math.min(sorted.length - 1, rawIndex));
  return sorted[index] ?? 0;
}

function toQueryPatternMetrics(
  input: MutableQueryPatternMetrics,
): QueryPatternMetrics {
  const average = input.totalTimeMs / input.count;
  const p95 = computePercentile(input.durationsMs, 0.95);

  return {
    fingerprint: getPatternFingerprint(input.sqlPattern),
    sqlPattern: input.sqlPattern,
    count: input.count,
    totalTimeMs: roundToTwo(input.totalTimeMs),
    avgTimeMs: roundToTwo(average),
    p95TimeMs: roundToTwo(p95),
    maxTimeMs: roundToTwo(input.maxTimeMs),
  };
}

function sortPatternMetrics(a: QueryPatternMetrics, b: QueryPatternMetrics) {
  if (b.totalTimeMs !== a.totalTimeMs) {
    return b.totalTimeMs - a.totalTimeMs;
  }

  if (b.count !== a.count) {
    return b.count - a.count;
  }

  return b.maxTimeMs - a.maxTimeMs;
}

export function parseQueryProfilerEvents(rawJsonLines: string) {
  const events: PrismaQueryProfilerEvent[] = [];
  const lines = rawJsonLines.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim();
    if (!line) {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      throw new Error(
        `[query-profiler] Invalid JSON on line ${index + 1}: ${String(error)}`,
      );
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new Error(
        `[query-profiler] Invalid event payload on line ${index + 1}`,
      );
    }

    const candidate = parsed as Partial<PrismaQueryProfilerEvent>;
    const eventType = candidate.eventType ?? "sql";
    if (
      (eventType !== "sql" && eventType !== "operation") ||
      typeof candidate.timestamp !== "string" ||
      typeof candidate.durationMs !== "number" ||
      typeof candidate.query !== "string" ||
      typeof candidate.params !== "string" ||
      typeof candidate.target !== "string" ||
      typeof candidate.pid !== "number"
    ) {
      throw new Error(
        `[query-profiler] Invalid event payload on line ${index + 1}`,
      );
    }

    events.push({
      eventType,
      timestamp: candidate.timestamp,
      durationMs: candidate.durationMs,
      query: candidate.query,
      params: candidate.params,
      target: candidate.target,
      pid: candidate.pid,
    });
  }

  return events;
}

export function buildQueryProfilerReport(
  events: PrismaQueryProfilerEvent[],
  options?: Partial<BuildQueryProfilerReportOptions>,
): QueryProfilerReport {
  const resolvedOptions: BuildQueryProfilerReportOptions = {
    ...DEFAULT_REPORT_OPTIONS,
    ...options,
  };

  const hasSqlEvents = events.some((event) => event.eventType === "sql");
  const selectedEventType =
    resolvedOptions.eventType === "auto"
      ? hasSqlEvents
        ? "sql"
        : "operation"
      : resolvedOptions.eventType;

  const selectedEvents = events.filter(
    (event) => event.eventType === selectedEventType,
  );

  const metricsByPattern = new Map<string, MutableQueryPatternMetrics>();
  let totalTimeMs = 0;

  for (const event of selectedEvents) {
    const sqlPattern = normalizeSqlPattern(event.query);
    totalTimeMs += event.durationMs;

    const existing = metricsByPattern.get(sqlPattern);
    if (existing) {
      existing.count += 1;
      existing.totalTimeMs += event.durationMs;
      existing.maxTimeMs = Math.max(existing.maxTimeMs, event.durationMs);
      existing.durationsMs.push(event.durationMs);
      continue;
    }

    metricsByPattern.set(sqlPattern, {
      sqlPattern,
      count: 1,
      totalTimeMs: event.durationMs,
      maxTimeMs: event.durationMs,
      durationsMs: [event.durationMs],
    });
  }

  const rankedPatterns = Array.from(metricsByPattern.values())
    .map(toQueryPatternMetrics)
    .sort(sortPatternMetrics);

  const focusNeedle = resolvedOptions.focusNeedle?.trim().toLowerCase() ?? "";
  const focusPatterns =
    focusNeedle.length > 0
      ? rankedPatterns.filter((pattern) =>
          pattern.sqlPattern.toLowerCase().includes(focusNeedle),
        )
      : [];

  return {
    eventType: selectedEventType,
    eventCount: selectedEvents.length,
    uniquePatternCount: rankedPatterns.length,
    totalTimeMs: roundToTwo(totalTimeMs),
    patterns: rankedPatterns.slice(0, resolvedOptions.top),
    focusPatterns: focusPatterns.slice(0, resolvedOptions.top),
  };
}

interface RenderQueryProfilerMarkdownOptions {
  sourcePath: string;
  focusNeedle: string;
}

function escapeMarkdownCodeText(value: string) {
  return value.replace(/`/g, "\\`");
}

function truncatePattern(sqlPattern: string, maxLength = 180) {
  if (sqlPattern.length <= maxLength) {
    return sqlPattern;
  }

  return `${sqlPattern.slice(0, maxLength - 3)}...`;
}

function metricsToMarkdownRows(metrics: QueryPatternMetrics[]) {
  if (metrics.length === 0) {
    return "| - | - | - | - | - | - | - |\n";
  }

  return metrics
    .map((metric) => {
      return `| ${metric.count} | ${metric.totalTimeMs.toFixed(2)} | ${metric.avgTimeMs.toFixed(2)} | ${metric.p95TimeMs.toFixed(2)} | ${metric.maxTimeMs.toFixed(2)} | \`${metric.fingerprint}\` | \`${escapeMarkdownCodeText(truncatePattern(metric.sqlPattern))}\` |`;
    })
    .join("\n");
}

export function renderQueryProfilerMarkdown(
  report: QueryProfilerReport,
  options: RenderQueryProfilerMarkdownOptions,
) {
  const headerLines = [
    "# Local Query Profiler Report",
    "",
    `- source: \`${options.sourcePath}\``,
    `- event_type: ${report.eventType}`,
    `- events: ${report.eventCount}`,
    `- unique_patterns: ${report.uniquePatternCount}`,
    `- total_time_ms: ${report.totalTimeMs.toFixed(2)}`,
    "",
    `## Top ${report.eventType === "sql" ? "SQL" : "Prisma Operation"} Patterns (ranked by total_time_ms)`,
    "",
    "| count | total_time_ms | avg_ms | p95_ms | max_ms | fingerprint | sql_pattern |",
    "| ---: | ---: | ---: | ---: | ---: | --- | --- |",
    metricsToMarkdownRows(report.patterns),
    "",
    `## Focused SQL Patterns (contains "${options.focusNeedle}")`,
    "",
    "| count | total_time_ms | avg_ms | p95_ms | max_ms | fingerprint | sql_pattern |",
    "| ---: | ---: | ---: | ---: | ---: | --- | --- |",
    metricsToMarkdownRows(report.focusPatterns),
    "",
  ];

  return headerLines.join("\n");
}
