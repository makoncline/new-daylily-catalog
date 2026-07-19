"use client";

import { useCallback } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import {
  Download,
  FileSpreadsheet,
  ListFilter,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { MAX_CATALOG_IMPORT_FILE_BYTES } from "@/lib/catalog-importer-file";
import { cn } from "@/lib/utils";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";

const ACCEPTED_FILES = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "text/csv": [".csv"],
};

interface CatalogImporterUploadProps {
  controller: CatalogImporterWorkbenchController;
  onEditMapping?: () => void;
}

function getRejectionMessage(rejections: FileRejection[]) {
  const firstError = rejections[0]?.errors[0];
  if (firstError?.code === "file-too-large") {
    return "Choose a spreadsheet smaller than 10 MB.";
  }
  if (firstError?.code === "too-many-files") {
    return "Choose one spreadsheet at a time.";
  }
  return "Use an .xlsx or .csv file. Older .xls files must be saved as .xlsx first.";
}

export function CatalogImporterUpload({
  controller,
  onEditMapping,
}: CatalogImporterUploadProps) {
  const onDropAccepted = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (file) {
        void controller.loadFile(file);
      }
    },
    [controller],
  );
  const onDropRejected = useCallback(
    (rejections: FileRejection[]) => {
      controller.rejectFile(getRejectionMessage(rejections));
    },
    [controller],
  );
  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    accept: ACCEPTED_FILES,
    disabled: controller.readingFile,
    maxFiles: 1,
    maxSize: MAX_CATALOG_IMPORT_FILE_BYTES,
    multiple: false,
    onDropAccepted,
    onDropRejected,
  });

  if (controller.parsedSpreadsheet) {
    return (
      <section
        aria-label="Uploaded spreadsheet"
        className="flex min-w-0 flex-col gap-3 border-y py-3 lg:flex-row lg:items-center"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
            <FileSpreadsheet className="text-muted-foreground size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {controller.parsedSpreadsheet.fileName}
            </p>
            <p className="text-muted-foreground text-xs">
              {controller.selectedSheet?.rows.length.toLocaleString() ?? 0} rows
              in selected sheet
            </p>
          </div>
        </div>

        <div className="grid gap-2 lg:flex lg:items-center">
          {controller.parsedSpreadsheet.sheets.length > 1 ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs font-medium">
                Sheet
              </span>
              <Select
                value={String(controller.selectedSheetIndex)}
                onValueChange={(value) => {
                  controller.configureSheet(
                    controller.parsedSpreadsheet!,
                    Number(value),
                  );
                  onEditMapping?.();
                }}
              >
                <SelectTrigger
                  className="h-8 min-w-0 flex-1 lg:w-56"
                  aria-label="Spreadsheet sheet"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {controller.parsedSpreadsheet.sheets.map((sheet, index) => (
                      <SelectItem
                        key={`${sheet.name}-${index}`}
                        value={String(index)}
                      >
                        {sheet.name} · {sheet.rows.length.toLocaleString()} rows
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {onEditMapping ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={onEditMapping}
            >
              <ListFilter className="size-4" />
              Map columns
            </Button>
          ) : null}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8">
                <Trash2 className="size-4" />
                Clear local progress
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear local progress?</AlertDialogTitle>
                <AlertDialogDescription>
                  This clears the workbook and all progress saved in this
                  browser. Your original file is not changed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={controller.resetImporter}>
                  Clear local progress
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="catalog-importer-upload-heading">
      <div className="mb-4">
        <h2
          id="catalog-importer-upload-heading"
          className="text-xl font-semibold"
        >
          Start with a spreadsheet
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Choose an XLSX or CSV file containing the listings for your catalog.
        </p>
      </div>
      <div className="space-y-4">
        <div
          {...getRootProps({
            "aria-label": "Upload spreadsheet",
            className: cn(
              "border-muted-foreground/35 bg-muted/20 hover:bg-muted/40 focus-visible:ring-ring flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              isDragActive && "border-primary bg-primary/5",
              controller.readingFile && "pointer-events-none opacity-60",
            ),
            role: "button",
          })}
        >
          <input {...getInputProps()} />
          <div className="bg-background mb-4 flex size-12 items-center justify-center rounded-full border shadow-sm">
            {controller.readingFile ? (
              <Spinner className="size-5" />
            ) : (
              <UploadCloud className="text-muted-foreground size-5" />
            )}
          </div>
          <p className="font-medium">
            {controller.readingFile
              ? "Reading workbook…"
              : isDragActive
                ? "Drop the spreadsheet here"
                : "Drop a spreadsheet here, or choose a file"}
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            XLSX or CSV · 10 MB maximum · 5,000 rows per sheet
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            onClick={controller.downloadTemplate}
          >
            <Download className="size-4" />
            Download template
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={controller.loadSampleCatalog}
          >
            <Sparkles className="size-4" />
            Use sample catalog
          </Button>
        </div>
      </div>
    </section>
  );
}
