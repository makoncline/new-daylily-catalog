"use client";

import { useCallback, useState } from "react";
import {
  createCatalogCleanSpreadsheet,
  createCatalogEnrichedSpreadsheet,
} from "@/lib/catalog-importer";
import type { CatalogImporterSession } from "@/lib/catalog-importer-draft";
import {
  downloadCatalogImportFile,
  getCatalogImporterDownloadFileName,
} from "@/lib/catalog-importer-file";

export function useCatalogImporterDownloads(
  {
    headerRowIndex,
    mapping,
    matchedRows,
    parsedSpreadsheet,
    selectedSheetIndex,
  }: Pick<
    CatalogImporterSession,
    | "headerRowIndex"
    | "mapping"
    | "matchedRows"
    | "parsedSpreadsheet"
    | "selectedSheetIndex"
  >,
  onDownloaded?: (message: string) => void,
) {
  const [downloadingResults, setDownloadingResults] = useState<
    "clean" | "enriched" | null
  >(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const downloadResults = useCallback(
    async (kind: "clean" | "enriched" = "enriched") => {
      if (!parsedSpreadsheet || !matchedRows) {
        return;
      }

      setDownloadingResults(kind);
      setDownloadError(null);
      try {
        const fileName = getCatalogImporterDownloadFileName(
          parsedSpreadsheet.fileName,
          kind,
        );
        const spreadsheet =
          kind === "clean"
            ? createCatalogCleanSpreadsheet({ matchedRows, parsedSpreadsheet })
            : createCatalogEnrichedSpreadsheet({
                headerRowIndex,
                mapping,
                matchedRows,
                parsedSpreadsheet,
                retainExcludedRows: true,
                selectedSheetIndex,
              });
        await downloadCatalogImportFile({ fileName, spreadsheet });
        onDownloaded?.(`${fileName} downloaded.`);
      } catch (error) {
        setDownloadError(
          error instanceof Error ? error.message : "Something went wrong.",
        );
      } finally {
        setDownloadingResults(null);
      }
    },
    [
      headerRowIndex,
      mapping,
      matchedRows,
      parsedSpreadsheet,
      selectedSheetIndex,
      onDownloaded,
    ],
  );

  return {
    downloadResults,
    downloadingResults,
    downloadError,
    setDownloadError,
  };
}
