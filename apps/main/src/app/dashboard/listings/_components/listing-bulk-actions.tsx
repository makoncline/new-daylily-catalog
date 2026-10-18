"use client";

import { useState } from "react";
import { type Table } from "@tanstack/react-table";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MultiListSelect } from "@/components/multi-list-select";
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
      "This permanently deletes the listings below and their images, and removes them from all lists. This cannot be undone.",
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
  viewingSelected,
  onViewSelected,
}: {
  table: Table<ListingData>;
  lists: { id: string; title: string }[];
  viewingSelected: boolean;
  onViewSelected: () => void;
}) {
  const { updateListing, deleteListing, addListingToList } = useDashboardDb();
  const selected = table.getSelectedRowModel().rows;
  const hiddenCount =
    selected.length - table.getFilteredSelectedRowModel().rows.length;
  const [request, setRequest] = useState<{
    action: Action;
    rows: ListingData[];
    hiddenCount: number;
  } | null>(null);
  const [listId, setListId] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const deleteConfirmed = deleteConfirmation.trim().toUpperCase() === "DELETE";
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
    setRequest({
      action,
      rows: selected
        .map((row) => row.original)
        .sort((a, b) => a.title.localeCompare(b.title)),
      hiddenCount,
    });
    setCompleted(0);
    setListId("");
    setDeleteConfirmation("");
    openDialog();
  }

  if (!selected.length && !viewingSelected && !isPending && !isDialogOpen)
    return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-11 sm:h-9"
              disabled={isPending || !selected.length}
            >
              Bulk actions ({selected.length.toLocaleString()})
              <ChevronDown data-icon="inline-end" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-48">
            <DropdownMenuGroup>
              {(["Add to list", "Hide", "Publish"] as const).map((action) => (
                <DropdownMenuItem
                  key={action}
                  className="min-h-11"
                  onSelect={() => confirm(action)}
                >
                  {action}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="min-h-11"
                onSelect={() => table.resetRowSelection()}
              >
                Clear selection
              </DropdownMenuItem>
              <DropdownMenuItem
                className="min-h-11"
                onSelect={() => confirm("Delete")}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          size="sm"
          variant="ghost"
          className="h-11 sm:h-9"
          disabled={isPending}
          onClick={onViewSelected}
        >
          {viewingSelected ? "Back to results" : "View selected"}
        </Button>
      </div>
      {isPending ? (
        <span role="status">
          {completed} of {request?.rows.length} changes confirmed…
        </span>
      ) : hiddenCount > 0 ? (
        <p className="text-muted-foreground text-sm">
          Hidden by your filters: {hiddenCount.toLocaleString()} selected.
        </p>
      ) : null}
      {request && (
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogContent className="flex max-h-9/10 w-11/12 flex-col overflow-y-auto max-sm:top-4 max-sm:translate-y-0">
            <AlertDialogHeader className="text-left">
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
              <AlertDialogDescription
                variant={request.action === "Delete" ? "emphasis" : "default"}
              >
                {actions[request.action].description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {request.hiddenCount > 0 && (
              <p className="text-sm">
                Hidden by your filters: {request.hiddenCount.toLocaleString()}{" "}
                selected. This action includes them.
              </p>
            )}
            <ul
              role="list"
              aria-label="Selected listings"
              tabIndex={0}
              className="max-h-44 min-h-0 list-none overflow-y-auto overscroll-contain border-y py-1 text-sm focus-visible:outline-offset-4 sm:max-h-64"
            >
              {request.rows.map((row) => (
                <li key={row.id} className="py-0.5 break-words">
                  {row.title}
                </li>
              ))}
            </ul>
            {request.action === "Add to list" && (
              <Field>
                <FieldLabel htmlFor="bulk-target-list">List</FieldLabel>
                <MultiListSelect
                  id="bulk-target-list"
                  multiple={false}
                  values={listId ? [listId] : []}
                  onSelect={(ids) => setListId(ids[0] ?? "")}
                  disabled={isPending}
                />
              </Field>
            )}
            {request.action === "Delete" && (
              <Field>
                <FieldLabel htmlFor="bulk-delete-confirmation">
                  <span>
                    Type <strong>DELETE</strong> to confirm
                  </span>
                </FieldLabel>
                <Input
                  id="bulk-delete-confirmation"
                  className="h-11 sm:h-9"
                  value={deleteConfirmation}
                  onChange={(event) =>
                    setDeleteConfirmation(event.target.value)
                  }
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </Field>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel className="h-11 sm:h-9">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="h-11 sm:h-9"
                variant={
                  request.action === "Delete"
                    ? deleteConfirmed
                      ? "destructive"
                      : "secondary"
                    : "default"
                }
                disabled={
                  isPending ||
                  (request.action === "Add to list" && !targetList) ||
                  (request.action === "Delete" && !deleteConfirmed)
                }
                onClick={() => void runAction()}
              >
                {request.action === "Delete"
                  ? `Delete ${request.rows.length} listing${request.rows.length === 1 ? "" : "s"}`
                  : request.action}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
