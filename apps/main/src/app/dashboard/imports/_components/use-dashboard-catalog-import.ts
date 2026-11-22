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

const PREVIEW_CULTIVAR_ID_LIMIT = 5_000;

type ImportResult = {
  createdCount: number;
  skippedNames: string[];
  notImportedCount: number;
};

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
      const catalog = await readPreview.mutateAsync({
        cultivarReferenceIds: cultivarReferenceIds.slice(
          0,
          PREVIEW_CULTIVAR_ID_LIMIT,
        ),
      });
      const knownCultivarIds = [...catalog.cultivarReferenceIds];
      for (
        let offset = PREVIEW_CULTIVAR_ID_LIMIT;
        offset < cultivarReferenceIds.length;
        offset += PREVIEW_CULTIVAR_ID_LIMIT
      ) {
        const next = await readPreview.mutateAsync({
          cultivarReferenceIds: cultivarReferenceIds.slice(
            offset,
            offset + PREVIEW_CULTIVAR_ID_LIMIT,
          ),
        });
        knownCultivarIds.push(...next.cultivarReferenceIds);
      }
      const nextPreview = previewDashboardImport(rows, {
        ...catalog,
        cultivarReferenceIds: knownCultivarIds,
      });
      setPreview({ ...nextPreview, fileName: file.name });
    } catch {
      setFileError("preview");
    } finally {
      busy.current = false;
      setProgress(null);
    }
  }

  async function runImport() {
    if (!preview || busy.current || result) return;
    const rowsToImport = [...preview.newRows, ...preview.skippedRows]
      .sort((left, right) => left.rowNumber - right.rowNumber)
      .map(({ listing }) => listing);
    if (rowsToImport.length === 0) return;

    busy.current = true;
    const batches = batchDashboardImportRows(rowsToImport);
    const report: ImportResult = {
      createdCount: 0,
      skippedNames: [],
      notImportedCount: rowsToImport.length,
    };
    try {
      for (const [index, rows] of batches.entries()) {
        setProgress(`Importing batch ${index + 1} of ${batches.length}…`);
        const batch = await importRows.mutateAsync({ rows });
        report.createdCount += batch.createdCount;
        report.skippedNames.push(...batch.skippedNames);
        report.notImportedCount -=
          batch.createdCount + batch.skippedNames.length;
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
