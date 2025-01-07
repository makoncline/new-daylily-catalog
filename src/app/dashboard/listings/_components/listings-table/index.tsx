"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import type { ListingGetOutput } from "@/server/api/routers/listing";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ListingForm } from "@/components/forms/listing-form";
import { TABLE_CONFIG } from "@/config/constants";

const { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE } = TABLE_CONFIG.PAGINATION;

interface ListingsTableProps {
  initialListings: ListingGetOutput[];
}

export function ListingsTable({ initialListings }: ListingsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("editing");
  const pageIndex = (Number(searchParams.get("page")) || 1) - 1;
  const pageSize = Number(searchParams.get("size")) || DEFAULT_PAGE_SIZE;

  // Use the initial data from the server, but keep it fresh with client-side updates
  const { data: listings } = api.listing.list.useQuery(undefined, {
    initialData: initialListings,
  });

  // Get the listing being edited
  const { data: editingListing } = api.listing.get.useQuery(
    { id: editingId! },
    {
      enabled: !!editingId,
      initialData: editingId
        ? listings?.find((l) => l.id === editingId)
        : undefined,
    },
  );

  const setEditing = (id: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (id) {
      params.set("editing", id);
    } else {
      params.delete("editing");
    }
    router.replace(`?${params.toString()}`);
  };

  const setPagination = (newPageIndex: number, newPageSize: number) => {
    const params = new URLSearchParams(searchParams);

    // Only include page if it's not the default (page 1)
    if (newPageIndex === DEFAULT_PAGE_INDEX) {
      params.delete("page");
    } else {
      // Increment the page number by 1 for the URL
      params.set("page", (newPageIndex + 1).toString());
    }

    // Only include size if it's not the default
    if (newPageSize === DEFAULT_PAGE_SIZE) {
      params.delete("size");
    } else {
      params.set("size", newPageSize.toString());
    }

    // Keep the editing param if it exists
    if (editingId) {
      params.set("editing", editingId);
    }

    const search = params.toString();
    router.replace(search ? `?${search}` : window.location.pathname);
  };

  return (
    <>
      <DataTable
        columns={columns}
        data={listings}
        options={{
          pinnedColumns: { left: 1, right: 1 },
          pagination: {
            pageIndex,
            pageSize,
          },
        }}
        onEdit={setEditing}
        onPaginationChange={setPagination}
      />

      <Dialog
        open={!!editingId}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto sm:max-w-xl md:max-w-2xl lg:max-w-4xl">
          {editingListing && (
            <>
              <DialogHeader>
                <DialogTitle>Edit: {editingListing.name}</DialogTitle>
                <DialogDescription>
                  Make changes to your listing here.
                </DialogDescription>
              </DialogHeader>
              <ListingForm
                listing={editingListing}
                onDelete={() => setEditing(null)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
