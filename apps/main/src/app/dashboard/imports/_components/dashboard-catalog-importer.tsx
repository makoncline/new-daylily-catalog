"use client";

import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useDashboardCatalogImport } from "./use-dashboard-catalog-import";

function PlaygroundLink() {
  return (
    <Link href="/playground" className="underline">
      Playground
    </Link>
  );
}

function ImportGroup({
  title,
  rows,
}: {
  title: string;
  rows: { rowNumber: number; title: string; detail?: string }[];
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h3 className="font-semibold">
        {title} ({rows.length})
      </h3>
      {rows.length > 0 && (
        <ul
          className="max-h-72 divide-y overflow-auto rounded-md border text-sm"
          tabIndex={0}
          aria-label={`${title} rows`}
        >
          {rows.map(({ rowNumber, title, detail }) => (
            <li key={rowNumber} className="px-3 py-2 wrap-anywhere">
              <span>{title || `Row ${rowNumber}`}</span>
              {detail && (
                <span className="text-muted-foreground block">{detail}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DashboardCatalogImporter() {
  const {
    fileError,
    importError,
    loadFile,
    preview,
    progress,
    result,
    runImport,
  } = useDashboardCatalogImport();
  const newCount = preview?.newRows.length ?? 0;
  const skippedCount = preview?.skippedRows.length ?? 0;
  return (
    <div
      className="flex max-w-3xl flex-col gap-5"
      data-ph-capture-attribute-flow="catalog-importer"
    >
      <Field
        data-disabled={Boolean(progress)}
        data-invalid={Boolean(fileError)}
      >
        <FieldLabel htmlFor="catalog-import-file">Playground file</FieldLabel>
        <Input
          id="catalog-import-file"
          type="file"
          accept=".xlsx,.csv"
          aria-describedby="catalog-import-file-help"
          aria-invalid={Boolean(fileError)}
          disabled={Boolean(progress)}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void loadFile(file);
          }}
        />
        <FieldDescription id="catalog-import-file-help">
          Build or clean your catalog in the <PlaygroundLink />, then upload the
          exported file.
        </FieldDescription>
      </Field>
      {fileError && (
        <Alert variant="destructive">
          <AlertDescription>
            {fileError === "format" ? (
              <p>
                This file is not a Playground export. Clean it in the{" "}
                <PlaygroundLink /> first.
              </p>
            ) : (
              <p>
                Could not check your catalog. Upload the file again to retry.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}
      {importError && (
        <Alert variant="destructive">
          <AlertTitle>Import did not finish</AlertTitle>
          <AlertDescription>
            <p>{importError}</p>
            <p>Upload the same file to import any remaining new listings.</p>
          </AlertDescription>
        </Alert>
      )}
      {result && (
        <Alert role="status">
          {!importError && (
            <AlertTitle>
              {result.createdCount
                ? "Import complete"
                : "Nothing new to import"}
            </AlertTitle>
          )}
          <AlertDescription>
            <p>
              {result.createdCount} created. {result.skippedNames.length}{" "}
              skipped because they are already in your catalog.
            </p>
            {result.notImportedCount > 0 && (
              <p>{result.notImportedCount} not imported.</p>
            )}
            {result.skippedNames.length > 0 && (
              <p className="wrap-anywhere">
                Skipped: {result.skippedNames.join(", ")}
              </p>
            )}
            <Link href="/dashboard/listings" className="underline">
              View catalog
            </Link>
          </AlertDescription>
        </Alert>
      )}
      {preview && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold">Preview</h2>
            <p className="text-muted-foreground text-sm wrap-anywhere">
              {preview.fileName}
            </p>
          </div>
          <ImportGroup
            title="New"
            rows={preview.newRows.map(({ rowNumber, listing }) => ({
              rowNumber,
              title: listing.title,
              detail: [
                listing.price === null ? "" : `Price: ${listing.price}`,
                listing.lists.join(", "),
                listing.cultivarReferenceId,
              ]
                .filter(Boolean)
                .join(" · "),
            }))}
          />
          <ImportGroup
            title="Already in your catalog (will be skipped)"
            rows={preview.skippedRows}
          />
          <ImportGroup
            title="Invalid"
            rows={preview.invalidRows.map(({ rowNumber, title, reason }) => ({
              rowNumber,
              title,
              detail: reason,
            }))}
          />
        </div>
      )}
      {newCount + skippedCount > 0 && !result && (
        <Button
          className="self-start"
          disabled={Boolean(progress)}
          onClick={() => void runImport()}
        >
          {newCount > 0
            ? `Import ${newCount} ${newCount === 1 ? "listing" : "listings"}`
            : "Check and import"}
        </Button>
      )}
      {progress && (
        <p
          className="text-muted-foreground flex items-center gap-2 text-sm"
          role="status"
        >
          <Spinner />
          {progress}
        </p>
      )}
    </div>
  );
}
