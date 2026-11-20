"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useCatalogImporterSession } from "@/hooks/use-catalog-importer-session";
import { useDashboardDb } from "@/app/dashboard/_components/dashboard-db-provider";
import {
  getCatalogImportRowDisposition,
  prepareCatalogImportListing,
  normalizeCatalogListNames,
} from "@/lib/catalog-importer";
import type { CatalogImporterDraft } from "@/lib/catalog-importer-draft";
import { getCatalogImportExistingListingMatch } from "@/lib/catalog-import-existing-listings";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import { api } from "@/trpc/react";
import {
  IMPORT_BATCH_SIZE,
  IMPORT_BUILDER_HREF,
} from "./dashboard-import-config";

export function useDashboardCatalogImport(
  initialDraft: CatalogImporterDraft | null,
) {
  const { refreshDashboardCatalog, userId } = useDashboardDb();
  const {
    session,
    sessionRef,
    commitSession,
    storageWarning,
    resetSession,
    getSourceCellsForRow,
  } = useCatalogImporterSession(initialDraft);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string> | null>(
    null,
  );
  const progress =
    session.importProgress?.userId === userId
      ? session.importProgress
      : undefined;
  const importedRowIds = useMemo(
    () => new Set(progress?.handledRowIds ?? []),
    [progress],
  );
  const skippedRowIds = useMemo(
    () => new Set(progress?.skippedRowIds ?? []),
    [progress],
  );
  const [isImporting, setIsImporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshWarning = progress?.refreshPending ?? false;
  const [importError, setImportError] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const busy = useRef(false);
  const refreshing = useRef(false);
  const importRows = api.dashboardV2.listing.importRows.useMutation();
  const existingListings = api.dashboardV2.listing.list.useQuery(undefined, {
    refetchOnMount: "always",
    retry: false,
    refetchOnWindowFocus: false,
  });
  const builderHref = IMPORT_BUILDER_HREF;
  const listingRows = useMemo(
    () =>
      (session.matchedRows ?? []).filter((row) => row.rowKind === "listing"),
    [session.matchedRows],
  );
  const reviewRows = listingRows.filter(
    (row) => getCatalogImportRowDisposition(row) === "review",
  );
  const issueRows = listingRows.filter(
    (row) => getCatalogImportRowDisposition(row) === "issue",
  );
  const builderExcludedRows = listingRows.filter(
    (row) => getCatalogImportRowDisposition(row) === "excluded",
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
  const ambiguousIds = useMemo(
    () =>
      new Set(
        existingMatchRows
          .filter((item) => item.match.kind === "ambiguous")
          .map((item) => item.row.id),
      ),
    [existingMatchRows],
  );
  const readyRows = useMemo(
    () =>
      eligibleRows.filter(
        (row) =>
          !ambiguousIds.has(row.id) &&
          !importedRowIds.has(row.id) &&
          !skippedRowIds.has(row.id),
      ),
    [eligibleRows, ambiguousIds, importedRowIds, skippedRowIds],
  );
  const readyRowIds = useMemo(
    () => new Set(readyRows.map((row) => row.id)),
    [readyRows],
  );
  const defaultSelectedRowIds = useMemo(
    () => new Set(readyRows.slice(0, IMPORT_BATCH_SIZE).map((row) => row.id)),
    [readyRows],
  );
  const effectiveSelectedRowIds = selectedRowIds ?? defaultSelectedRowIds;
  const selectedReadyRows = readyRows.filter((row) =>
    effectiveSelectedRowIds.has(row.id),
  );
  const importPlan = (() => {
    const candidates = (existingListings.data ?? []).map(
      ({
        id,
        title,
        cultivarReferenceId,
        price,
        description,
        privateNote,
      }) => ({
        id,
        title,
        cultivarReferenceId,
        price,
        description,
        privateNote,
      }),
    );
    const rowActions = new Map<string, string>();
    let newRowCount = 0;
    let reusedRowCount = 0;
    let skippedRowCount = 0;
    for (const row of selectedReadyRows) {
      const comparable = prepareCatalogImportListing(row);
      const match = getCatalogImportExistingListingMatch(
        comparable,
        candidates,
      );
      if (match.kind === "none") {
        candidates.push({
          id: `draft:${row.id}`,
          ...comparable,
        });
        rowActions.set(row.id, "Create");
        newRowCount++;
      } else if (match.kind === "duplicate") {
        rowActions.set(row.id, "Already saved · details unchanged");
        reusedRowCount++;
      } else {
        rowActions.set(row.id, "Skip");
        skippedRowCount++;
      }
    }
    return { rowActions, newRowCount, reusedRowCount, skippedRowCount };
  })();
  const listCount = new Set(
    selectedReadyRows.flatMap((row) =>
      normalizeCatalogListNames(row.lists ?? []).map((title) =>
        title.toLowerCase(),
      ),
    ),
  ).size;

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

  const setRowSelected = (rowId: string, selected: boolean) =>
    setRowsSelected([rowId], selected);

  const startOver = () => {
    if (busy.current) return;
    resetSession();
    setLiveAnnouncement(
      "Import progress cleared. Your Playground catalog is unchanged.",
    );
    setSelectedRowIds(null);
    setImportError(null);
  };
  const retryRefresh = async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    setIsRefreshing(true);
    try {
      await refreshDashboardCatalog();
      const refreshed = await existingListings.refetch();
      if (refreshed.isError) throw new Error("Catalog refresh failed");
      const current = sessionRef.current.importProgress;
      if (current?.userId === userId)
        await commitSession({
          importProgress: { ...current, refreshPending: false },
        });
    } catch {
      // Keep the persisted refresh warning. The database write is complete.
    } finally {
      refreshing.current = false;
      setIsRefreshing(false);
    }
  };
  const runImport = async () => {
    if (busy.current || refreshWarning) return;
    setImportError(null);
    const rows = selectedReadyRows.map((row) => ({
      ...prepareCatalogImportListing(row),
      lists: normalizeCatalogListNames(row.lists ?? []),
      importKey: `${session.projectId}:${row.id}`,
    }));
    if (rows.length === 0 || rows.length > IMPORT_BATCH_SIZE) {
      setImportError("Select between 1 and 100 listings.");
      return;
    }
    busy.current = true;
    setIsImporting(true);
    try {
      const result = await importRows.mutateAsync({ rows });
      const skippedKeys = new Set(
        result.skippedRows.map((row) => row.importKey),
      );
      const completed = selectedReadyRows.filter(
        (row) => !skippedKeys.has(`${session.projectId}:${row.id}`),
      );
      const skipped = selectedReadyRows.filter((row) =>
        skippedKeys.has(`${session.projectId}:${row.id}`),
      );
      const previous =
        sessionRef.current.importProgress?.userId === userId
          ? sessionRef.current.importProgress
          : undefined;
      await commitSession({
        importProgress: {
          userId,
          handledRowIds: [
            ...new Set([
              ...(previous?.handledRowIds ?? []),
              ...completed.map((row) => row.id),
            ]),
          ],
          skippedRowIds: [
            ...new Set([
              ...(previous?.skippedRowIds ?? []),
              ...skipped.map((row) => row.id),
            ]),
          ],
          createdCount: (previous?.createdCount ?? 0) + result.createdCount,
          unchangedCount:
            (previous?.unchangedCount ?? 0) +
            result.reusedCount +
            result.alreadyImportedCount,
          skippedNames: [
            ...(previous?.skippedNames ?? []),
            ...result.skippedRows.map((row) => row.title),
          ],
          refreshPending: true,
        },
      });
      setSelectedRowIds(null);
      const message = `${result.createdCount} created, ${result.reusedCount + result.alreadyImportedCount} already saved with unchanged details, ${result.skippedCount} skipped.`;
      setLiveAnnouncement(message);
      capturePosthogEvent("catalog_import_completed", {
        import_id: session.projectId,
        created_count: result.createdCount,
        existing_count: result.reusedCount + result.alreadyImportedCount,
        skipped_count: result.skippedCount,
      });
      await retryRefresh();
    } catch (error) {
      setImportError(
        error instanceof Error
          ? `${error.message} Your prepared import is still saved. You can retry safely.`
          : "Import did not finish. Your prepared import is still saved. You can retry safely.",
      );
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
    batchResult: progress
      ? {
          createdCount: progress.createdCount,
          alreadyExistedCount: progress.unchangedCount,
          skippedCount: progress.skippedRowIds.length,
          skippedNames: progress.skippedNames,
          remainingCount: listingRows.length - progress.handledRowIds.length,
        }
      : null,
    remainingCount: listingRows.length - importedRowIds.size,
    retrySkipped: () => {
      if (busy.current) return;
      if (progress)
        void commitSession({
          importProgress: { ...progress, skippedRowIds: [], skippedNames: [] },
        });
    },
    builderExcludedRows,
    builderHref,
    existingListings,
    getSourceCellsForRow,
    hasPreparedRows: session.matchedRows !== null,
    importedRowCount: importedRowIds.size,
    importError,
    isImporting,
    isRefreshing,
    issueRows,
    liveAnnouncement,
    storageWarning,
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
    ...importPlan,
    listCount,
    ambiguousRows: existingMatchRows.filter(
      (item) => item.match.kind === "ambiguous",
    ),
  };
}
