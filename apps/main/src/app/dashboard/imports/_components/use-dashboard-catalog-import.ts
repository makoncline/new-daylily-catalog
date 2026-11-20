import { useRef, useState } from "react";
import { toast } from "sonner";
import { useDashboardDb } from "@/app/dashboard/_components/dashboard-db-provider";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import { api } from "@/trpc/react";
import {
  batchDashboardImportRows,
  previewDashboardImport,
  readDashboardImportFile,
} from "./dashboard-import-file";

type ImportResult = { createdCount: number; skippedNames: string[] };

export function useDashboardCatalogImport() {
  const { refreshDashboardCatalog } = useDashboardDb();
  const readPreview = api.dashboardV2.listing.readImportPreview.useMutation();
  const importRows = api.dashboardV2.listing.importRows.useMutation();
  const busy = useRef(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [preview, setPreview] = useState<
    (ReturnType<typeof previewDashboardImport> & { fileName: string }) | null
  >(null);
  const [fileError, setFileError] = useState<"format" | "preview" | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function loadFile(file: File) {
    if (busy.current) return;
    busy.current = true;
    setProgress("Checking your file and catalog…");
    setPreview(null);
    setFileError(null);
    setImportError(null);
    setResult(null);
    try {
      const rows = await readDashboardImportFile(file);
      if (!rows) {
        setFileError("format");
        return;
      }
      const cultivarReferenceIds = [
        ...new Set(
          rows.flatMap((row) =>
            "listing" in row && row.cultivarReferenceId !== null
              ? [row.cultivarReferenceId]
              : [],
          ),
        ),
      ];
      const catalog = await readPreview.mutateAsync({ cultivarReferenceIds });
      const nextPreview = previewDashboardImport(rows, catalog);
      setPreview({ ...nextPreview, fileName: file.name });
      if (nextPreview.newRows.length === 0) {
        setResult({
          createdCount: 0,
          skippedNames: nextPreview.skippedRows.map(({ title }) => title),
        });
      }
    } catch {
      setFileError("preview");
    } finally {
      busy.current = false;
      setProgress(null);
    }
  }

  async function runImport() {
    if (!preview?.newRows.length || busy.current || result) return;
    busy.current = true;
    const batches = batchDashboardImportRows(
      preview.newRows.map(({ listing }) => listing),
    );
    const report = {
      createdCount: 0,
      skippedNames: preview.skippedRows.map(({ title }) => title),
    };
    try {
      for (const [index, rows] of batches.entries()) {
        setProgress(`Importing batch ${index + 1} of ${batches.length}…`);
        const batch = await importRows.mutateAsync({ rows });
        report.createdCount += batch.createdCount;
        report.skippedNames.push(...batch.skippedNames);
      }
      capturePosthogEvent("catalog_import_completed", {
        created_count: report.createdCount,
        skipped_count: report.skippedNames.length,
      });
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Could not save the batch.",
      );
      capturePosthogEvent("catalog_import_failed", {
        error_code: "catalog_write_failed",
        stage: "dashboard-import",
      });
    } finally {
      setProgress("Refreshing your catalog…");
      await refreshDashboardCatalog().catch(() => {
        toast.error(
          "Could not refresh your dashboard. Use the dashboard refresh button to try again.",
        );
      });
      setResult(report);
      busy.current = false;
      setProgress(null);
    }
  }

  return {
    fileError,
    importError,
    loadFile,
    preview,
    progress,
    result,
    runImport,
  };
}
