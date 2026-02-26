import {
  buildQueryProfilerReport,
  parseQueryProfilerEvents,
} from "@/server/db/query-profiler-report";
import { describe, expect, it } from "vitest";

function buildEventLine(input: {
  durationMs: number;
  query: string;
  eventType?: "sql" | "operation";
  params?: string;
  target?: string;
}) {
  return JSON.stringify({
    eventType: input.eventType ?? "sql",
    timestamp: "2026-02-26T00:00:00.000Z",
    durationMs: input.durationMs,
    query: input.query,
    params: input.params ?? "[]",
    target: input.target ?? "quaint::connector::metrics",
    pid: 12345,
  });
}

describe("query profiler report", () => {
  it("ranks sql patterns by total time and computes aggregate metrics", () => {
    const raw = [
      buildEventLine({
        durationMs: 40,
        query: 'SELECT * FROM "CultivarReference" WHERE "normalizedName" = ?',
      }),
      buildEventLine({
        durationMs: 10,
        query:
          'SELECT *  FROM  "CultivarReference"\nWHERE "normalizedName" = ?',
      }),
      buildEventLine({
        durationMs: 30,
        query: 'SELECT * FROM "CultivarReference" WHERE "normalizedName" = ?',
      }),
      buildEventLine({
        durationMs: 50,
        query: 'SELECT * FROM "Listing" WHERE "id" = ?',
      }),
    ].join("\n");

    const report = buildQueryProfilerReport(parseQueryProfilerEvents(raw), {
      top: 10,
      focusNeedle: "cultivar",
    });

    expect(report.eventType).toBe("sql");
    expect(report.eventCount).toBe(4);
    expect(report.uniquePatternCount).toBe(2);
    expect(report.totalTimeMs).toBe(130);

    expect(report.patterns).toHaveLength(2);
    expect(report.patterns[0]?.sqlPattern).toBe(
      'SELECT * FROM "CultivarReference" WHERE "normalizedName" = ?',
    );
    expect(report.patterns[0]?.count).toBe(3);
    expect(report.patterns[0]?.totalTimeMs).toBe(80);
    expect(report.patterns[0]?.avgTimeMs).toBeCloseTo(26.67, 2);
    expect(report.patterns[0]?.p95TimeMs).toBe(40);
    expect(report.patterns[0]?.maxTimeMs).toBe(40);

    expect(report.patterns[1]?.sqlPattern).toBe(
      'SELECT * FROM "Listing" WHERE "id" = ?',
    );
    expect(report.patterns[1]?.totalTimeMs).toBe(50);
  });

  it("returns an empty focus list when no pattern matches the focus needle", () => {
    const raw = buildEventLine({
      durationMs: 20,
      query: 'SELECT * FROM "Listing" WHERE "id" = ?',
    });

    const report = buildQueryProfilerReport(parseQueryProfilerEvents(raw), {
      top: 10,
      focusNeedle: "cultivar",
    });

    expect(report.focusPatterns).toStrictEqual([]);
  });

  it("falls back to operation events when sql events are unavailable", () => {
    const raw = [
      buildEventLine({
        eventType: "operation",
        durationMs: 120,
        query:
          "/* operation */ Listing.findMany(where|include|orderBy|take|skip)",
      }),
      buildEventLine({
        eventType: "operation",
        durationMs: 60,
        query:
          "/* operation */ Listing.findMany(where|include|orderBy|take|skip)",
      }),
      buildEventLine({
        eventType: "operation",
        durationMs: 30,
        query: "/* operation */ CultivarReference.findFirst(where|include)",
      }),
    ].join("\n");

    const report = buildQueryProfilerReport(parseQueryProfilerEvents(raw), {
      top: 10,
      focusNeedle: "cultivar",
    });

    expect(report.eventType).toBe("operation");
    expect(report.eventCount).toBe(3);
    expect(report.patterns[0]?.count).toBe(2);
    expect(report.patterns[0]?.totalTimeMs).toBe(180);
    expect(report.focusPatterns[0]?.sqlPattern).toContain("CultivarReference");
  });
});
