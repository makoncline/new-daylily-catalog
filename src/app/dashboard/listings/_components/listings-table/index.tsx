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

interface ListingsTableProps {
  initialListings: ListingGetOutput[];
}

export function ListingsTable({ initialListings }: ListingsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("editing");

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

  return (
    <>
      <DataTable
        columns={columns}
        data={listings}
        options={{ pinnedColumns: { left: 1, right: 1 } }}
        onEdit={setEditing}
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
