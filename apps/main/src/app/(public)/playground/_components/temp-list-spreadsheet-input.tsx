"use client";

import { useId, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  cellToText,
  detectHeaderRow,
  type ParsedSpreadsheet,
} from "@/lib/catalog-importer";
import {
  MAX_CATALOG_IMPORT_FILE_BYTES,
  parseCatalogImportFile,
} from "@/lib/catalog-importer-file";
import type { CatalogSpreadsheetInput } from "@/lib/catalog-input";
import {
  TEMP_LIST_CULTIVAR_HEADERS,
  type TempInputBatch,
} from "../_lib/temp-list";
import {
  getTempSheetColumns,
  isTempListExport,
  readTempListSheet,
  suggestTempColumnMapping,
} from "../_lib/temp-list-spreadsheet";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const FIELDS = [
  { key: "title", label: "Cultivar name" },
  { key: "price", label: "Price" },
  { key: "description", label: "Description" },
  { key: "privateNote", label: "Private note" },
  { key: "lists", label: "Lists" },
  { key: "cultivarReferenceId", label: "Cultivar ID" },
] as const;

export function TempListSpreadsheetInput({
  disabled,
  checking = false,
  remaining,
  summary,
  sheetDraft,
  onAdd,
  onSourceChange,
  onSheetChange,
}: {
  disabled: boolean;
  checking?: boolean;
  remaining: number;
  summary: string | null;
  sheetDraft: CatalogSpreadsheetInput | null;
  onSheetChange: (sheet: CatalogSpreadsheetInput) => void;
  onAdd: (batch: TempInputBatch) => Promise<boolean>;
  onSourceChange: () => void;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const workbook = sheetDraft?.workbook;
  const sheetIndex = sheetDraft?.index ?? 0;
  const header = sheetDraft?.header ?? null;
  const mapping = sheetDraft?.mapping;
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sheet = workbook?.sheets[sheetIndex];
  const dataRows = sheet?.rows.slice((header ?? -1) + 1) ?? [];
  const sourceColumns = sheet ? getTempSheetColumns(sheet, header) : [];
  const exported = isTempListExport(sourceColumns);
  const columns = sourceColumns
    .filter(
      ({ label }) =>
        !exported ||
        !TEMP_LIST_CULTIVAR_HEADERS.some((header) => header === label),
    )
    .map((column) => ({
      ...column,
      sample:
        dataRows.map((row) => cellToText(row[column.index])).find(Boolean) ??
        "",
    }));
  const rowCount = dataRows.filter((row) =>
    row.some((cell) => cellToText(cell)),
  ).length;
  const busy = disabled || reading;
  const capacityError =
    rowCount > remaining
      ? `This sheet has ${rowCount} entries. There is room for ${remaining} more flowers.`
      : null;

  function selectSheet(next: ParsedSpreadsheet, index: number) {
    onSourceChange();
    const sheet = next.sheets[index]!;
    const detected = detectHeaderRow(sheet.rows);
    onSheetChange({
      workbook: next,
      index,
      header: detected,
      mapping: suggestTempColumnMapping(sheet, detected),
    });
    setError(null);
  }

  async function loadFile(file: File) {
    setReading(true);
    setError(null);
    try {
      const next = await parseCatalogImportFile(file);
      selectSheet(next, 0);
    } catch (failure) {
      const message =
        failure instanceof Error
          ? failure.message
          : "Could not read this file.";
      setError(file.name + ": " + message);
    } finally {
      setReading(false);
    }
  }

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    maxFiles: 1,
    multiple: false,
    maxSize: MAX_CATALOG_IMPORT_FILE_BYTES,
    disabled: busy,
    onDropRejected: () => {
      setError("Choose one CSV or XLSX file, no larger than 10 MB.");
    },
    onDropAccepted: ([file]) => {
      if (file) void loadFile(file);
    },
  });

  async function addSheet() {
    if (!sheet || !mapping || busy) return;
    setError(null);
    try {
      const batch = readTempListSheet(sheet, header, mapping);
      const count = batch.listings.length + (batch.issues?.length ?? 0);
      if (!count) throw new Error("There are no named entries in this sheet.");
      if (count > remaining)
        throw new Error(
          `This sheet has ${count} entries. There is room for ${remaining} more flowers.`,
        );
      await onAdd(batch);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not add this sheet.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <input {...getInputProps()} />
      {workbook && sheet ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 font-medium break-all">{workbook.fileName}</p>
            <Button variant="ghost" size="sm" disabled={busy} onClick={open}>
              Choose another file
            </Button>
          </div>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              {workbook.sheets.length > 1 ? (
                <Field>
                  <FieldLabel htmlFor={`${inputId}-sheet`}>Sheet</FieldLabel>
                  <Select
                    value={String(sheetIndex)}
                    disabled={busy}
                    onValueChange={(value) =>
                      selectSheet(workbook, Number(value))
                    }
                  >
                    <SelectTrigger id={`${inputId}-sheet`} aria-label="Sheet">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {workbook.sheets.map((item, index) => (
                          <SelectItem key={index} value={String(index)}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              <Field>
                <FieldLabel htmlFor={`${inputId}-header`}>
                  Header row
                </FieldLabel>
                <Select
                  value={header === null ? "none" : String(header)}
                  disabled={busy}
                  onValueChange={(value) => {
                    onSourceChange();
                    const next = value === "none" ? null : Number(value);
                    onSheetChange({
                      workbook,
                      index: sheetIndex,
                      header: next,
                      mapping: suggestTempColumnMapping(sheet, next),
                    });
                    setError(null);
                  }}
                >
                  <SelectTrigger
                    id={`${inputId}-header`}
                    aria-label="Header row"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">No header row</SelectItem>
                      {sheet.rows.map((_, index) => (
                        <SelectItem key={index} value={String(index)}>
                          Row {index + 1}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </FieldGroup>

          <Table aria-label="Column mapping" variant="outline">
            <TableHeader>
              <TableRow>
                {columns.map(({ index, label }) => (
                  <TableHead key={index} className="min-w-40">
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                {columns.map(({ index, sample }) => (
                  <TableCell key={index} className="max-w-56">
                    <p className="truncate" title={sample}>
                      {sample || "—"}
                    </p>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                {columns.map(({ index, label }) => (
                  <TableCell key={index}>
                    <Select
                      disabled={busy}
                      value={
                        FIELDS.find(({ key }) => mapping?.[key] === index)
                          ?.key ?? "extra"
                      }
                      onValueChange={(value) => {
                        onSourceChange();
                        if (!sheetDraft) return;
                        const next = { ...sheetDraft.mapping };
                        for (const { key } of FIELDS)
                          if (next[key] === index) next[key] = null;
                        const field = FIELDS.find(({ key }) => key === value);
                        if (field) next[field.key] = index;
                        onSheetChange({ ...sheetDraft, mapping: next });
                        setError(null);
                      }}
                    >
                      <SelectTrigger aria-label={`Map ${label}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="extra">Download only</SelectItem>
                          {FIELDS.map(({ key, label }) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>

          <p
            role="status"
            aria-label="Spreadsheet summary"
            className="text-muted-foreground text-sm"
          >
            {summary ??
              `${rowCount} ${rowCount === 1 ? "row" : "rows"} ready to check`}
          </p>
          <Button
            className="self-start"
            disabled={busy || mapping?.title == null || Boolean(capacityError)}
            onClick={() => void addSheet()}
          >
            {checking ? "Checking…" : reading ? "Reading…" : "Check names"}
          </Button>
        </>
      ) : (
        <div
          {...getRootProps({
            role: "button",
            "aria-label": "Upload spreadsheet",
            "aria-disabled": busy,
            "aria-describedby": error ? errorId : undefined,
            className:
              "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center focus-visible:outline-2 focus-visible:outline-ring",
          })}
        >
          <p className="font-medium">
            {reading
              ? "Reading spreadsheet…"
              : isDragActive
                ? "Drop the file here"
                : "Drop a spreadsheet here, or choose a file"}
          </p>
          <p className="text-muted-foreground text-sm">
            CSV or XLSX · 10 MB maximum
          </p>
        </div>
      )}
      {error || capacityError ? (
        <FieldError id={errorId}>{error ?? capacityError}</FieldError>
      ) : null}
    </div>
  );
}
