"use client";

import { Download } from "lucide-react";
import { type Table, type ColumnMeta } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";

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
      return value
        .map((item) => {
          if (item && typeof item === "object") {
            const namedItem = item as Partial<NamedItem>;
            return namedItem.name ?? String(item);
          }
          return String(item);
        })
        .filter(Boolean)
        .join(", ");
    }

    // Handle objects (try to get name or title property)
    if (value && typeof value === "object") {
      const namedItem = value as Partial<NamedItem>;
      const titledItem = value as Partial<TitledItem>;
      return namedItem.name ?? titledItem.title ?? "";
    }

    return String(value);
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

    const excludedColumns = ["actions", "select"];

    // We know headerGroups[0] exists after the length check
    const headers = headerGroups[0]!.headers
      .filter(
        (header) =>
          header.column.getIsVisible() &&
          !excludedColumns.includes(header.column.id),
      )
      .map((header) => {
        // Use meta title if available, otherwise use column id
        const columnMeta = header.column.columnDef.meta as
          | CustomColumnMeta
          | undefined;
        return columnMeta?.title ? String(columnMeta.title) : header.column.id;
      });

    // Get visible rows and their cell values
    const rows = table.getRowModel().rows.map((row) => {
      return row
        .getVisibleCells()
        .filter((cell) => !excludedColumns.includes(cell.column.id))
        .map((cell) => {
          const value = cell.getValue();
          return escapeCSV(formatValue(value));
        });
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
        <Download className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
