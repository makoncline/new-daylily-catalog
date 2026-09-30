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
  const hasRows = table.getRowModel().rows.length > 0;

  return (
    <div id="data-table" className="flex flex-col gap-4">
      {toolbar}
      {children}
      {hasRows
        ? pagination
        : (noResults ?? (
            <div className="rounded-md border p-8 text-center">No results.</div>
          ))}
    </div>
  );
}

export function DataTableLayoutSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-30" />
      <Skeleton className="h-100" />
      <DataTablePaginationSkeleton />
    </div>
  );
}
