import type { Table } from "@tanstack/react-table";
import { DataTablePaginationSkeleton } from "./data-table-pagination";
import { Skeleton } from "../ui/skeleton";

interface DataTableLayoutProps<TData> {
  table: Table<TData>;
  children: React.ReactNode;
  toolbar?: React.ReactNode;
  pagination?: React.ReactNode;
  noResults?: React.ReactNode;
}

export function DataTableLayout<TData>({
  table,
  children,
  toolbar,
  pagination,
  noResults,
}: DataTableLayoutProps<TData>) {
  if (!table || typeof table.getRowModel !== "function") {
    return (
      <div className="space-y-4">
        {toolbar}
        {noResults}
        {pagination}
      </div>
    );
  }

  const rowModel = table.getRowModel();
  const rows = rowModel?.rows;

  if (!rows || rows.length === 0) {
    return (
      <div className="space-y-4">
        {toolbar}
        {noResults}
        {pagination}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toolbar}
      {children}
      {pagination}
    </div>
  );
}

export function DataTableLayoutSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-[120px]" />
      <Skeleton className="h-[400px]" />
      <DataTablePaginationSkeleton />
    </div>
  );
}
