import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock("@tanstack/browser-db-sqlite-persistence");
});

describe("dashboard DB SQLite persistence", () => {
  it("returns null when browser SQLite persistence initialization fails", async () => {
    vi.resetModules();
    vi.stubGlobal("Worker", class Worker {});
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: {
        getDirectory: vi.fn(),
      },
    });

    vi.doMock("@tanstack/browser-db-sqlite-persistence", () => ({
      BrowserCollectionCoordinator: class BrowserCollectionCoordinator {},
      createBrowserWASQLitePersistence: vi.fn(),
      openBrowserWASQLiteOPFSDatabase: vi.fn(async () => {
        throw new Error("sqlite open failed");
      }),
    }));

    const { getDashboardDbSqlitePersistence } = await import(
      "@/app/dashboard/_lib/dashboard-db/dashboard-db-sqlite-persistence"
    );

    await expect(getDashboardDbSqlitePersistence()).resolves.toBeNull();
  });
});
