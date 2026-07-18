"use client";

import { useState } from "react";
import { CircleAlert, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CatalogImporterMapping } from "@/app/(public)/catalog-importer/_components/catalog-importer-mapping";
import { CatalogImporterResults } from "@/app/(public)/catalog-importer/_components/catalog-importer-results";
import { CatalogImporterUpload } from "@/app/(public)/catalog-importer/_components/catalog-importer-upload";
import { useCatalogImporterWorkbench } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import type { CatalogImporterDraft } from "@/lib/catalog-importer-draft";

export function CatalogImporterWorkbench({
  initialDraft = null,
}: {
  initialDraft?: CatalogImporterDraft | null;
}) {
  const controller = useCatalogImporterWorkbench(initialDraft);
  const [mappingOpened, setMappingOpened] = useState(false);
  const editingMapping = controller.matchedRows === null || mappingOpened;

  return (
    <div>
      <div className="space-y-4">
        <CatalogImporterUpload
          controller={controller}
          onEditMapping={
            controller.matchedRows
              ? () => {
                  setMappingOpened(true);
                }
              : undefined
          }
        />

        {controller.fileError ? (
          <Alert variant="destructive">
            <CircleAlert className="size-4" />
            <AlertTitle>Could not read that spreadsheet</AlertTitle>
            <AlertDescription>{controller.fileError}</AlertDescription>
          </Alert>
        ) : null}

        {controller.storageWarning ? (
          <Alert>
            <Info className="size-4" />
            <AlertTitle>Progress will not be restored</AlertTitle>
            <AlertDescription>{controller.storageWarning}</AlertDescription>
          </Alert>
        ) : null}

        {controller.selectedSheet && editingMapping ? (
          <CatalogImporterMapping
            controller={controller}
            onSubmit={() => {
              setMappingOpened(false);
              controller.buildCatalogPreview();
            }}
          />
        ) : null}

        {controller.selectedSheet && controller.mapping.title === null ? (
          <Alert variant="destructive">
            <CircleAlert className="size-4" />
            <AlertTitle>Cultivar name is required</AlertTitle>
            <AlertDescription>
              Choose the column that contains cultivar names to build your
              catalog preview.
            </AlertDescription>
          </Alert>
        ) : null}

        {controller.matchError ? (
          <Alert variant="destructive">
            <CircleAlert className="size-4" />
            <AlertTitle>Cultivar matching did not finish</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{controller.matchError}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={controller.buildCatalogPreview}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {controller.mapping.title !== null &&
        controller.matchedRows &&
        !editingMapping ? (
          <CatalogImporterResults controller={controller} />
        ) : null}
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {controller.liveAnnouncement}
      </div>
    </div>
  );
}
