import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("memory telemetry", () => {
  it("does not log or start an interval when disabled", async () => {
    const { startMemoryTelemetry } = await import(
      "@/server/observability/memory-telemetry"
    );
    const log = vi.fn();
    const setIntervalFn = vi.fn();

    const started = startMemoryTelemetry({
      env: {},
      globalState: {},
      log,
      setIntervalFn,
    });

    expect(started).toBe(false);
    expect(log).not.toHaveBeenCalled();
    expect(setIntervalFn).not.toHaveBeenCalled();
  });

  it("logs the boot event and process memory JSON shape when enabled", async () => {
    const { startMemoryTelemetry } = await import(
      "@/server/observability/memory-telemetry"
    );
    const log = vi.fn();
    const unref = vi.fn();
    let intervalCallback: (() => void) | undefined;
    const setIntervalFn = vi.fn((callback: () => void) => {
      intervalCallback = callback;
      return { unref };
    });

    const started = startMemoryTelemetry({
      env: { MEMORY_TELEMETRY_ENABLED: "1" },
      getHeapSizeLimit: () => 4_294_967_296,
      getMemoryUsage: () => ({
        rss: 101,
        heapTotal: 202,
        heapUsed: 303,
        external: 404,
        arrayBuffers: 505,
      }),
      getNodeVersion: () => "v99.0.0",
      getPid: () => 1234,
      getTimestamp: () => "2026-07-02T20:00:00.000Z",
      getUptimeSeconds: () => 61.5,
      globalState: {},
      log,
      setIntervalFn,
    });

    expect(started).toBe(true);
    expect(setIntervalFn).toHaveBeenCalledWith(expect.any(Function), 60_000);
    expect(unref).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0]?.[0] as string)).toEqual({
      event: "v8_heap_limit",
      timestamp: "2026-07-02T20:00:00.000Z",
      pid: 1234,
      nodeVersion: "v99.0.0",
      heap_size_limit: 4_294_967_296,
    });

    intervalCallback?.();

    expect(JSON.parse(log.mock.calls[1]?.[0] as string)).toEqual({
      event: "process_memory",
      timestamp: "2026-07-02T20:00:00.000Z",
      pid: 1234,
      uptimeSeconds: 61.5,
      rss: 101,
      heapTotal: 202,
      heapUsed: 303,
      external: 404,
      arrayBuffers: 505,
    });
  });

  it("does not create duplicate intervals for repeated initialization", async () => {
    const { startMemoryTelemetry } = await import(
      "@/server/observability/memory-telemetry"
    );
    const globalState = {};
    const log = vi.fn();
    const setIntervalFn = vi.fn(() => ({ unref: vi.fn() }));
    const deps = {
      env: { MEMORY_TELEMETRY_ENABLED: "1" },
      getHeapSizeLimit: () => 1,
      getMemoryUsage: () => process.memoryUsage(),
      getNodeVersion: () => "v99.0.0",
      getPid: () => 1234,
      getTimestamp: () => "2026-07-02T20:00:00.000Z",
      getUptimeSeconds: () => 1,
      globalState,
      log,
      setIntervalFn,
    };

    expect(startMemoryTelemetry(deps)).toBe(true);
    expect(startMemoryTelemetry(deps)).toBe(false);

    expect(log).toHaveBeenCalledTimes(1);
    expect(setIntervalFn).toHaveBeenCalledTimes(1);
  });
});
