"use client";

import { Download } from "lucide-react";
import { type Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";

interface DataTableDownloadProps<TData> {
  table: Table<TData>;
  filenamePrefix?: string;
}

interface NamedItem {
  name: string;
}

interface TitledItem {
  title: string;
}

interface CustomColumnMeta {
  title?: string;
}

export function DataTableDownload<TData>({
  table,
  filenamePrefix = "table-data",
}: DataTableDownloadProps<TData>) {
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "";

    // Handle dates
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    // Handle arrays (like for Lists column)
    if (Array.isArray(value)) {
      const formattedItems: string[] = [];

      for (const item of value) {
        const formattedItem =
          item && typeof item === "object"
            ? ((item as Partial<NamedItem>).name ?? String(item))
            : String(item);

        if (formattedItem) {
          formattedItems.push(formattedItem);
        }
      }

      return formattedItems.join(", ");
    }

    // Handle objects (try to get name or title property)
    if (value && typeof value === "object") {
      const namedItem = value as Partial<NamedItem>;
      const titledItem = value as Partial<TitledItem>;
      return namedItem.name ?? titledItem.title ?? "";
    }

    return JSON.stringify(value);
  };

  const escapeCSV = (value: string): string => {
    // If the value contains commas, quotes, or newlines, wrap it in quotes
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const getFormattedDate = () => {
    const date = new Date();
    return date
      .toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "-");
  };

  const downloadAsCsv = () => {
    // Get visible columns
    const headerGroups = table.getHeaderGroups();
    if (!headerGroups.length) return;

    const excludedColumns = new Set(["actions", "select"]);

    // We know headerGroups[0] exists after the length check
    const headers = [];
    for (const header of headerGroups[0]!.headers) {
      if (
        !header.column.getIsVisible() ||
        excludedColumns.has(header.column.id)
      ) {
        continue;
      }

      // Use meta title if available, otherwise use column id
      const columnMeta = header.column.columnDef.meta as
        | CustomColumnMeta
        | undefined;
      headers.push(
        columnMeta?.title ? String(columnMeta.title) : header.column.id,
      );
    }

    // Get ALL rows and their cell values (not just visible ones)
    const rows = table.getCoreRowModel().rows.map((row) => {
      const rowValues = [];

      for (const cell of row.getVisibleCells()) {
        if (excludedColumns.has(cell.column.id)) {
          continue;
        }

        rowValues.push(escapeCSV(formatValue(cell.getValue())));
      }

      return rowValues;
    });

    // Create CSV content
    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const filename = `${filenamePrefix}-${getFormattedDate()}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex">
      <div className="flex-1" />
      <Button
        variant="outline"
        size="sm"
        onClick={downloadAsCsv}
        className="h-8 px-2 lg:px-3"
      >
        Download CSV
        <Download className="ml-2 size-4" />
      </Button>
    </div>
  );
}
