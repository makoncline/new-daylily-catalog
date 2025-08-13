"use client";

import * as React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import { type Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { P, Muted } from "@/components/typography";
import { APP_CONFIG } from "@/config/constants";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  pageSizeOptions?: number[];
}

export function DataTablePaginationSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1" />
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-8 w-12" />
      <Skeleton className="h-8 w-12" />
    </div>
  );
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = APP_CONFIG.TABLE.PAGINATION.PAGE_SIZE_OPTIONS,
}: DataTablePaginationProps<TData>) {
  const { pageSize, pageIndex } = table.getState().pagination;
  const numSelected = table.getFilteredSelectedRowModel().rows.length;
  const totalCount = table.getFilteredRowModel().rows.length;
  const pageCount = Math.ceil(totalCount / pageSize);

  const scrollToTable = React.useCallback(() => {
    const tableElement = document.getElementById("data-table");
    tableElement?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="flex">
      <div className="flex-1" />
      <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
        {numSelected > 0 && (
          <Muted className="text-sm">
            {numSelected} of {totalCount} row(s) selected.
          </Muted>
        )}
        <div className="flex flex-col items-end gap-4 sm:flex-row sm:gap-6 lg:gap-8">
          <div className="flex items-center space-x-2">
            <P className="text-sm font-medium">Rows per page</P>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
                scrollToTable();
              }}
            >
              <SelectTrigger className="h-8 w-[70px]" data-testid="page-size">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Page {pageIndex + 1} of {pageCount}
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => {
                  table.firstPage();
                  scrollToTable();
                }}
                disabled={!table.getCanPreviousPage()}
                data-testid="first-page"
              >
                <span className="sr-only">Go to first page</span>
                <DoubleArrowLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => {
                  table.previousPage();
                  scrollToTable();
                }}
                disabled={!table.getCanPreviousPage()}
                data-testid="prev-page"
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => {
                  table.nextPage();
                  scrollToTable();
                }}
                disabled={!table.getCanNextPage()}
                data-testid="next-page"
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => {
                  table.lastPage();
                  scrollToTable();
                }}
                disabled={!table.getCanNextPage()}
                data-testid="last-page"
              >
                <span className="sr-only">Go to last page</span>
                <DoubleArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
