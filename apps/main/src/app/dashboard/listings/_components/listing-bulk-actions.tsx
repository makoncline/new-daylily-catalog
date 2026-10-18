"use client";

import { useState } from "react";
import { type Table } from "@tanstack/react-table";
import { toast } from "sonner";
import { useDashboardDb } from "@/app/dashboard/_components/dashboard-db-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  "Add to list": {
    description:
      "Add these listings to the list you choose. Listings already in this list stay there. Other list memberships and visibility do not change.",
  },
};
type Action = keyof typeof actions;

export function ListingBulkActions({
  table,
  lists,
}: {
  table: Table<ListingData>;
  lists: { id: string; title: string }[];
}) {
  const { updateListing, deleteListing, addListingToList } = useDashboardDb();
  const selected = table
    .getSortedRowModel()
    .rows.filter((row) => row.getIsSelected());
  const [request, setRequest] = useState<{
    action: Action;
    rows: ListingData[];
  } | null>(null);
  const [listId, setListId] = useState("");
  const targetList = lists.find((list) => list.id === listId);
  const [completed, setCompleted] = useState(0);
  const { isDialogOpen, setIsDialogOpen, openDialog, isPending, runAction } =
    useConfirmableAsyncAction({
      action: async () => {
        if (!request || (request.action === "Add to list" && !targetList))
          return;
        let confirmed = 0;
        try {
          for (const row of request.rows) {
            if (request.action === "Add to list") {
              await addListingToList({ listId, listingId: row.id });
            } else if (request.action === "Delete") {
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
          request.action === "Add to list"
            ? `${confirmed} listing${confirmed === 1 ? " is" : "s are"} in “${targetList?.title}”`
            : `${confirmed} listing${confirmed === 1 ? "" : "s"} ${actions[request.action].result}`,
        );
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });

  function confirm(action: Action) {
    setRequest({ action, rows: selected.map((row) => row.original) });
    setCompleted(0);
    setListId("");
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
        disabled={isPending || lists.length === 0}
        onClick={() => confirm("Add to list")}
      >
        Add to list
      </Button>
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
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogContent className="max-h-dvh w-11/12 overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {request.action === "Add to list" ? "Add" : request.action}{" "}
                {request.rows.length} listing
                {request.rows.length === 1 ? "" : "s"}
                {request.action === "Add to list"
                  ? targetList
                    ? ` to “${targetList.title}”`
                    : " to a list"
                  : ""}
                ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {actions[request.action].description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {request.action === "Add to list" && (
              <Field>
                <FieldLabel htmlFor="bulk-target-list">List</FieldLabel>
                <Select value={listId} onValueChange={setListId}>
                  <SelectTrigger id="bulk-target-list">
                    <SelectValue placeholder="Choose a list" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {lists.map((list) => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.title}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
            <ul
              aria-label="Affected listings"
              className="max-h-64 list-disc overflow-y-auto pl-5 break-words"
            >
              {request.rows.map((row) => (
                <li key={row.id}>{row.title}</li>
              ))}
            </ul>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant={
                  request.action === "Delete" ? "destructive" : "default"
                }
                disabled={
                  isPending || (request.action === "Add to list" && !targetList)
                }
                onClick={() => void runAction()}
              >
                {request.action}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
