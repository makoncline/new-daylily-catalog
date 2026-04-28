"use client";

import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import { CreateListingButton } from "./create-listing-button";
import { useEditListing } from "./edit-listing-dialog";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableDownload } from "@/components/data-table";
import { APP_CONFIG } from "@/config/constants";
import { getColumns } from "./columns";
import { useDashboardListingReadModel } from "@/app/dashboard/_lib/dashboard-db/use-dashboard-listing-read-model";
import { DashboardListingFilterToolbar } from "@/app/dashboard/_components/dashboard-listing-filter-toolbar";

function ListingsTableLive() {
  const { editListing } = useEditListing();
  const { listingRows: listings, lists } = useDashboardListingReadModel();

  const columns = getColumns(editListing);

  const table = useDataTable({
    data: listings,
    columns,
    storageKey: "listings-table",
    pinnedColumns: {
      left: ["select", "title"],
      right: ["actions"],
    },
    config: {
      enableRowSelection: true,
    },
    initialStateOverrides: {
      pagination: {
        pageSize: APP_CONFIG.TABLE.PAGINATION.DASHBOARD_PAGE_SIZE_DEFAULT,
      },
    },
  });

  if (!listings.length) {
    return (
      <EmptyState
        title="No listings"
        description="Create your first listing to start selling"
        action={<CreateListingButton />}
      />
    );
  }

  return (
    <div data-testid="listing-table">
      <DataTableLayout
        table={table}
        toolbar={
          <DashboardListingFilterToolbar
            table={table}
            lists={lists}
            listings={listings}
            placeholder="Filter listings..."
          />
        }
        pagination={
          <>
            <DataTablePagination
              table={table}
              pageSizeOptions={
                APP_CONFIG.TABLE.PAGINATION.DASHBOARD_PAGE_SIZE_OPTIONS
              }
            />
            <DataTableDownload table={table} filenamePrefix="listings" />
          </>
        }
        noResults={
          <EmptyState
            title="No listings found"
            description="Try adjusting your filters or create a new listing"
            action={<CreateListingButton />}
          />
        }
      >
        <DataTable table={table} />
      </DataTableLayout>
    </div>
  );
}

export function ListingsTable() {
  return <ListingsTableLive />;
}
