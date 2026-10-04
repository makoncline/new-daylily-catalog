"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useCatalogImporterSession } from "@/hooks/use-catalog-importer-session";
import { useDashboardDb } from "@/app/dashboard/_components/dashboard-db-provider";
import { refreshDashboardDbFromServer } from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence";
import {
  getCatalogImportRowDisposition,
  prepareCatalogImportListing,
} from "@/lib/catalog-importer";
import type { CatalogImporterDraft } from "@/lib/catalog-importer-draft";
import { getCatalogImportExistingListingMatch } from "@/lib/catalog-import-existing-listings";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import { api } from "@/trpc/react";

import { IMPORT_BATCH_SIZE } from "./dashboard-import-config";

function getImportErrorMessage(error: unknown) {
  if (
    error instanceof Error &&
    (error.message.includes("Upgrade to Pro") ||
      error.message.includes("Cultivar reference not found") ||
      error.message.includes("Review the existing listing"))
  ) {
    return error.message;
  }

  return "Your import is still saved. Try creating the listings again.";
}

export function useDashboardCatalogImport(
  initialDraft: CatalogImporterDraft | null,
) {
  const { session, resetSession, getSourceCellsForRow } =
    useCatalogImporterSession(initialDraft);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string> | null>(
    null,
  );
  const [importedRowIds, setImportedRowIds] = useState(() => new Set<string>());
  const busy = useRef(false);
  const [isImporting, setIsImporting] = useState(false);
  const refreshing = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshWarning, setRefreshWarning] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<{
    alreadyExistedCount: number;
    createdCount: number;
    remainingCount: number;
  } | null>(null);
  const importCompleted = useRef(false);
  const importTotals = useRef({
    createdCount: 0,
    existingCount: 0,
    importedCount: 0,
  });
  const importRows = api.dashboardDb.listing.importRows.useMutation();
  const { userId: dashboardUserId } = useDashboardDb();
  const existingListings = api.dashboardDb.listing.list.useQuery(undefined, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const listingRows = useMemo(
    () =>
      (session.matchedRows ?? []).filter((row) => row.rowKind === "listing"),
    [session.matchedRows],
  );
  const reviewRows = useMemo(
    () =>
      listingRows.filter(
        (row) => getCatalogImportRowDisposition(row) === "review",
      ),
    [listingRows],
  );
  const issueRows = useMemo(
    () =>
      listingRows.filter(
        (row) => getCatalogImportRowDisposition(row) === "issue",
      ),
    [listingRows],
  );
  const eligibleRows = useMemo(
    () =>
      listingRows.filter(
        (row) => getCatalogImportRowDisposition(row) === "ready",
      ),
    [listingRows],
  );
  const existingMatchRows = useMemo(
    () =>
      eligibleRows.flatMap((row) => {
        const comparable = prepareCatalogImportListing(row);
        const match = getCatalogImportExistingListingMatch(
          comparable,
          existingListings.data ?? [],
        );
        return match.kind === "none" ? [] : [{ comparable, match, row }];
      }),
    [eligibleRows, existingListings.data],
  );
  const existingRowIds = useMemo(
    () => new Set(existingMatchRows.map(({ row }) => row.id)),
    [existingMatchRows],
  );
  const readyRows = useMemo(
    () =>
      eligibleRows.filter(
        (row) => !existingRowIds.has(row.id) && !importedRowIds.has(row.id),
      ),
    [eligibleRows, existingRowIds, importedRowIds],
  );
  const readyRowIds = useMemo(
    () => new Set(readyRows.map((row) => row.id)),
    [readyRows],
  );
  const defaultSelectedRowIds = useMemo(
    () =>
      new Set(
        readyRows
          .slice(0, IMPORT_BATCH_SIZE)
          .map((currentRow) => currentRow.id),
      ),
    [readyRows],
  );
  const effectiveSelectedRowIds = selectedRowIds ?? defaultSelectedRowIds;
  const selectedReadyRows = useMemo(
    () => readyRows.filter((row) => effectiveSelectedRowIds.has(row.id)),
    [effectiveSelectedRowIds, readyRows],
  );
  const importedRows = useMemo(
    () =>
      eligibleRows.filter(
        (row) => importedRowIds.has(row.id) && !existingRowIds.has(row.id),
      ),
    [eligibleRows, existingRowIds, importedRowIds],
  );
  const builderExcludedRows = listingRows.filter(
    (row) => getCatalogImportRowDisposition(row) === "excluded",
  );
  const builderExcludedCount = builderExcludedRows.length;

  const setRowSelected = useCallback(
    (rowId: string, selected: boolean) => {
      if (busy.current) return;
      setSelectedRowIds((current) => {
        const next = new Set(current ?? defaultSelectedRowIds);
        if (selected && readyRowIds.has(rowId) && next.size < IMPORT_BATCH_SIZE)
          next.add(rowId);
        else if (!selected) next.delete(rowId);
        return next;
      });
    },
    [defaultSelectedRowIds, readyRowIds],
  );

  const setRowsSelected = useCallback(
    (rowIds: string[], selected: boolean) => {
      if (busy.current) return;
      setSelectedRowIds((current) => {
        const next = new Set(current ?? defaultSelectedRowIds);
        for (const rowId of rowIds) {
          if (
            selected &&
            readyRowIds.has(rowId) &&
            next.size < IMPORT_BATCH_SIZE
          )
            next.add(rowId);
          else if (!selected) next.delete(rowId);
        }
        return next;
      });
    },
    [defaultSelectedRowIds, readyRowIds],
  );

  const startOver = () => {
    if (busy.current) return;
    resetSession();
    setLiveAnnouncement("Local progress cleared.");
    setRefreshWarning(false);
    setSelectedRowIds(null);
    setImportedRowIds(new Set());
    setImportError(null);
    setBatchResult(null);
    importCompleted.current = false;
    importTotals.current = {
      createdCount: 0,
      existingCount: 0,
      importedCount: 0,
    };
  };

  const retryRefresh = async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    setIsRefreshing(true);
    setRefreshWarning(false);
    try {
      if (dashboardUserId) {
        const applied = await refreshDashboardDbFromServer(dashboardUserId);
        setRefreshWarning(!applied);
      }
    } catch {
      setRefreshWarning(true);
    } finally {
      refreshing.current = false;
      setIsRefreshing(false);
    }
  };

  const runImport = async () => {
    if (busy.current) return;
    setImportError(null);
    setBatchResult(null);
    const rows = selectedReadyRows.map((row) => ({
      ...prepareCatalogImportListing(row),
      allowExistingDuplicate: false,
      importKey: `${session.projectId}:${row.id}`,
    }));

    if (rows.length === 0) {
      setImportError("Select at least one listing to import.");
      return;
    }
    if (rows.length > IMPORT_BATCH_SIZE) {
      setImportError("Select no more than 100 listings.");
      return;
    }

    busy.current = true;
    setIsImporting(true);
    setRefreshWarning(false);
    try {
      const result = await importRows.mutateAsync({ rows });
      const importedIds = selectedReadyRows.map((row) => row.id);
      const remainingCount = Math.max(0, readyRows.length - rows.length);
      const nextTotals = {
        createdCount: importTotals.current.createdCount + result.createdCount,
        existingCount:
          importTotals.current.existingCount +
          result.existingCount +
          result.skippedExactCount,
        importedCount: importTotals.current.importedCount + rows.length,
      };
      importTotals.current = nextTotals;
      setImportedRowIds((current) => new Set([...current, ...importedIds]));
      setSelectedRowIds(null);
      setBatchResult({
        alreadyExistedCount: result.existingCount + result.skippedExactCount,
        createdCount: result.createdCount,
        remainingCount,
      });
      if (remainingCount === 0 && !importCompleted.current) {
        importCompleted.current = true;
        capturePosthogEvent("catalog_import_completed", {
          created_count: nextTotals.createdCount,
          existing_count: existingMatchRows.length + nextTotals.existingCount,
          import_id: session.projectId,
          imported_count: nextTotals.importedCount,
          skipped_count:
            reviewRows.length + issueRows.length + builderExcludedCount,
        });
      }
      await retryRefresh();
    } catch (error) {
      setImportError(getImportErrorMessage(error));
      capturePosthogEvent("catalog_import_failed", {
        error_code: "catalog_write_failed",
        import_id: session.projectId,
        stage: "dashboard-import",
      });
    } finally {
      busy.current = false;
      setIsImporting(false);
    }
  };

  return {
    batchResult,
    builderExcludedRows,
    existingListings,
    existingMatchRows,
    getSourceCellsForRow,
    hasPreparedRows: session.matchedRows !== null,
    hasSpreadsheet: session.parsedSpreadsheet !== null,
    importedRows,
    importedRowCount: importedRowIds.size,
    importError,
    isImporting,
    isRefreshing,
    issueRows,
    liveAnnouncement,
    projectId: session.projectId,
    readyRows,
    refreshWarning,
    retryRefresh,
    reviewRows,
    runImport,
    selectedReadyRows,
    selectedRowIds: effectiveSelectedRowIds,
    setRowSelected,
    setRowsSelected,
    startOver,
  };
}
