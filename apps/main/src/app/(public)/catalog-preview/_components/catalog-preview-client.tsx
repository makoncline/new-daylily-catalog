"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { CircleAlert } from "lucide-react";
import { CatalogImporterCatalogPreview } from "@/app/(public)/catalog-importer/_components/catalog-importer-catalog-preview";
import { useCatalogImporterWorkbench } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function getGoogleSheetCsvUrl(sheetId: string, gid?: string) {
  const url = new URL(
    `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/export`,
  );
  url.searchParams.set("format", "csv");
  if (gid) url.searchParams.set("gid", gid);
  return url.toString();
}

export function CatalogPreviewClient({
  gid,
  sheetId,
  title,
}: {
  gid?: string;
  sheetId: string;
  title: string;
}) {
  const controller = useCatalogImporterWorkbench(null, { saveDraft: false });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sourceError, setSourceError] = useState<string | null>(null);
  const builtSpreadsheet = useRef<string | null>(null);
  const buildCatalogPreview = controller.buildCatalogPreview;
  const loadFile = controller.loadFile;
  const mappingTitle = controller.mapping.title;
  const matchedRows = controller.matchedRows;
  const parsedSpreadsheet = controller.parsedSpreadsheet;
  const processingStage = controller.processingStage;

  useEffect(() => {
    const abortController = new AbortController();

    void fetch(getGoogleSheetCsvUrl(sheetId, gid), {
      cache: "no-store",
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("The public Google Sheet could not be downloaded.");
        }

        const csv = await response.text();
        const loaded = await loadFile(
          new File([csv], `${sheetId}.csv`, { type: "text/csv" }),
        );
        if (!loaded) return;
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSourceError(
            error instanceof Error
              ? error.message
              : "The public Google Sheet could not be loaded.",
          );
        }
      });

    return () => abortController.abort();
  }, [gid, loadFile, sheetId]);

  useEffect(() => {
    if (!parsedSpreadsheet || processingStage !== null || mappingTitle === null)
      return;

    if (
      matchedRows === null &&
      builtSpreadsheet.current !== parsedSpreadsheet.fileName
    ) {
      builtSpreadsheet.current = parsedSpreadsheet.fileName;
      void buildCatalogPreview();
    }
  }, [
    buildCatalogPreview,
    mappingTitle,
    matchedRows,
    parsedSpreadsheet,
    processingStage,
  ]);

  const error =
    sourceError ??
    controller.fileError ??
    controller.matchError ??
    (parsedSpreadsheet && mappingTitle === null
      ? "The sheet needs a recognizable cultivar-name header before it can be previewed."
      : null);

  return (
    <main className="mx-auto w-full max-w-[1024px] px-3 py-8 lg:px-8 lg:py-12">
      <header className="mb-8 max-w-3xl">
        <p className="text-muted-foreground text-sm font-medium">
          Read-only catalog preview
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
      </header>

      {error ? (
        <Alert variant="destructive">
          <CircleAlert className="size-4" />
          <AlertTitle>Catalog preview unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : controller.matchedRows ? (
        <CatalogImporterCatalogPreview
          columnFilters={columnFilters}
          controller={controller}
          globalFilter={globalFilter}
          onColumnFiltersChange={setColumnFilters}
          onGlobalFilterChange={setGlobalFilter}
          readOnly
        />
      ) : (
        <div
          className="text-muted-foreground flex items-center gap-2 py-8 text-sm"
          role="status"
        >
          <Spinner />
          {controller.processingStage
            ? "Matching cultivars and building the preview…"
            : "Loading the public Google Sheet…"}
        </div>
      )}

      <div className="mt-10 border-t pt-6">
        <Button asChild>
          <Link href="/catalog-importer">Try your own catalog</Link>
        </Button>
      </div>
    </main>
  );
}
