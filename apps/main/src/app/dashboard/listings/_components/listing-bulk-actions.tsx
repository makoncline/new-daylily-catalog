"use client";

import { useState } from "react";
import { type Table } from "@tanstack/react-table";
import { toast } from "sonner";
import { useDashboardDb } from "@/app/dashboard/_components/dashboard-db-provider";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import { useConfirmableAsyncAction } from "@/hooks/use-confirmable-async-action";
import { getErrorMessage } from "@/lib/error-utils";
import { type ListingData } from "./listing-table-model";

const actions = {
  Hide: {
    result: "hidden",
    description: "These listings will no longer appear in your public catalog.",
  },
  Publish: {
    result: "published",
    description: "These listings will appear in your public catalog.",
  },
  Delete: {
    result: "deleted",
    description:
      "These listings will be permanently deleted from your catalog and all lists. This cannot be undone.",
  },
};
type Action = keyof typeof actions;

export function ListingBulkActions({ table }: { table: Table<ListingData> }) {
  const { updateListing, deleteListing } = useDashboardDb();
  const selected = table
    .getSortedRowModel()
    .rows.filter((row) => row.getIsSelected());
  const [request, setRequest] = useState<{
    action: Action;
    rows: ListingData[];
  } | null>(null);
  const [completed, setCompleted] = useState(0);
  const { isDialogOpen, setIsDialogOpen, openDialog, isPending, runAction } =
    useConfirmableAsyncAction({
      action: async () => {
        if (!request) return;
        let confirmed = 0;
        try {
          for (const row of request.rows) {
            if (request.action === "Delete") {
              await deleteListing({ id: row.id });
            } else {
              await updateListing({
                id: row.id,
                expectedUpdatedAt: row.updatedAt.toISOString(),
                data: { status: request.action === "Hide" ? "HIDDEN" : null },
              });
            }
            confirmed++;
            setCompleted(confirmed);
            table.setRowSelection((previous) => {
              const next = { ...previous };
              delete next[row.id];
              return next;
            });
          }
        } catch (error) {
          throw new Error(
            `${confirmed} of ${request.rows.length} changes were confirmed. Refresh your catalog before trying again. ${getErrorMessage(error)}`,
          );
        }
        toast.success(
          `${confirmed} listing${confirmed === 1 ? "" : "s"} ${actions[request.action].result}`,
        );
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });

  function confirm(action: Action) {
    setRequest({ action, rows: selected.map((row) => row.original) });
    setCompleted(0);
    openDialog();
  }

  if (!selected.length && !isPending && !isDialogOpen) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span role="status">
        {isPending
          ? `${completed} of ${request?.rows.length} changes confirmed…`
          : `${selected.length} selected in these results`}
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => confirm("Hide")}
      >
        Hide selected
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => confirm("Publish")}
      >
        Publish selected
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={isPending}
        onClick={() => confirm("Delete")}
      >
        Delete selected
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() => table.resetRowSelection()}
      >
        Clear selection
      </Button>
      {request && (
        <DeleteConfirmDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onConfirm={() => void runAction()}
          title={`${request.action} ${request.rows.length} listing${request.rows.length === 1 ? "" : "s"}?`}
          description={actions[request.action].description}
          actionLabel={request.action}
          destructive={request.action === "Delete"}
        />
      )}
    </div>
  );
}
