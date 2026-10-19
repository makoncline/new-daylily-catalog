import "fake-indexeddb/auto";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCatalogImporterSession } from "@/hooks/use-catalog-importer-session";
import {
  clearCatalogImporterDraft,
  readCatalogImporterDraft,
  writeCatalogImporterDraft,
} from "@/lib/catalog-importer-draft";

vi.mock("@/lib/catalog-importer-draft", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/catalog-importer-draft")>();
  return {
    ...original,
    writeCatalogImporterDraft: vi.fn(original.writeCatalogImporterDraft),
  };
});

const spreadsheet = (fileName: string) => ({
  fileName,
  sheets: [
    {
      name: "Catalog",
      rows: [
        ["name", "price"],
        ["Garden Bloom", "15"],
      ],
    },
  ],
});

describe("catalog importer session", () => {
  beforeEach(async () => {
    await clearCatalogImporterDraft();
    vi.mocked(writeCatalogImporterDraft).mockClear();
  });

  it("flushes queued edits and clear before a replacement workbook is restored", async () => {
    const original = await vi.importActual<
      typeof import("@/lib/catalog-importer-draft")
    >("@/lib/catalog-importer-draft");
    let releaseWrite!: () => void;
    const heldWrite = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    vi.mocked(writeCatalogImporterDraft).mockImplementationOnce(
      async (draft) => {
        await heldWrite;
        return original.writeCatalogImporterDraft(draft);
      },
    );
    const editor = renderHook(() => useCatalogImporterSession());
    const firstProjectId = editor.result.current.session.projectId;
    let flushed!: Promise<void>;
    act(() => {
      void editor.result.current.commitSession({
        parsedSpreadsheet: spreadsheet("first.csv"),
      });
      editor.result.current.resetSession();
      void editor.result.current.commitSession({
        parsedSpreadsheet: spreadsheet("replacement.csv"),
        headerRowIndex: 0,
        mapping: {
          cultivarReferenceId: null,
          description: null,
          price: 1,
          privateNote: null,
          title: 0,
        },
      });
      flushed = editor.result.current.flushDraft();
    });
    expect(editor.result.current.session.parsedSpreadsheet?.fileName).toBe(
      "replacement.csv",
    );
    expect(await readCatalogImporterDraft()).toBeNull();
    await act(async () => {
      releaseWrite();
      await flushed;
    });
    editor.unmount();
    const restored = await readCatalogImporterDraft();
    const dashboard = renderHook(() => useCatalogImporterSession(restored));
    expect(dashboard.result.current.session.parsedSpreadsheet?.fileName).toBe(
      "replacement.csv",
    );
    expect(dashboard.result.current.session.projectId).not.toBe(firstProjectId);
    dashboard.unmount();
  });

  it("keeps clear behind an unfinished write so progress cannot return on reload", async () => {
    const original = await vi.importActual<
      typeof import("@/lib/catalog-importer-draft")
    >("@/lib/catalog-importer-draft");
    let releaseWrite!: () => void;
    const heldWrite = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    vi.mocked(writeCatalogImporterDraft).mockImplementationOnce(
      async (draft) => {
        await heldWrite;
        return original.writeCatalogImporterDraft(draft);
      },
    );
    const editor = renderHook(() => useCatalogImporterSession());
    let flushed!: Promise<void>;
    act(() => {
      void editor.result.current.commitSession({
        parsedSpreadsheet: spreadsheet("cleared.csv"),
      });
      editor.result.current.resetSession();
      flushed = editor.result.current.flushDraft();
    });
    await act(async () => {
      releaseWrite();
      await flushed;
    });
    editor.unmount();
    expect(await readCatalogImporterDraft()).toBeNull();
  });
});
