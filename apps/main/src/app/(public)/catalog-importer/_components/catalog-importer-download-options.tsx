"use client";

import { useState } from "react";
import { Download } from "lucide-react";
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
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import { cn } from "@/lib/utils";

export function CatalogImporterDownloadOptions({
  controller,
  stacked = false,
}: {
  controller: CatalogImporterWorkbenchController;
  stacked?: boolean;
}) {
  const [pendingDownload, setPendingDownload] = useState<
    "clean" | "enriched" | null
  >(null);

  const requestDownload = (kind: "clean" | "enriched") => {
    if (
      controller.reviewRows.length > 0 ||
      controller.remainingIssueCount > 0
    ) {
      setPendingDownload(kind);
      return;
    }

    void controller.downloadResults(kind);
  };

  return (
    <>
      <ItemGroup className="gap-5">
        <Item
          className={cn(
            "flex-col items-stretch gap-3 px-0",
            !stacked && "sm:flex-row sm:items-center",
          )}
        >
          <ItemContent>
            <ItemTitle>Prepared import file</ItemTitle>
            <ItemDescription className="line-clamp-none">
              One normalized listing table with corrections and Daylily Catalog
              identity where available. Excluded rows and unrelated columns are
              omitted. Use it in the importer or upload it to the builder again.
            </ItemDescription>
          </ItemContent>
          <ItemActions className={cn("w-full", !stacked && "sm:w-auto")}>
            <Button
              type="button"
              className={cn("w-full", !stacked && "sm:w-auto")}
              disabled={controller.downloadingResults !== null}
              onClick={() => requestDownload("clean")}
            >
              {controller.downloadingResults === "clean" ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Download data-icon="inline-start" />
              )}
              Download prepared import file
            </Button>
          </ItemActions>
        </Item>
        <Item
          className={cn(
            "flex-col items-stretch gap-3 px-0",
            !stacked && "sm:flex-row sm:items-center",
          )}
        >
          <ItemContent>
            <ItemTitle>Enhanced original</ItemTitle>
            <ItemDescription className="line-clamp-none">
              Every original sheet, row, and field, with corrections and
              Daylily Catalog identity added. Excluded rows remain.
            </ItemDescription>
          </ItemContent>
          <ItemActions className={cn("w-full", !stacked && "sm:w-auto")}>
            <Button
              type="button"
              className={cn("w-full", !stacked && "sm:w-auto")}
              variant="outline"
              disabled={controller.downloadingResults !== null}
              onClick={() => requestDownload("enriched")}
            >
              {controller.downloadingResults === "enriched" ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Download data-icon="inline-start" />
              )}
              Download enhanced original
            </Button>
          </ItemActions>
        </Item>
      </ItemGroup>

      <AlertDialog
        open={pendingDownload !== null}
        onOpenChange={(open) => !open && setPendingDownload(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Download before review is complete?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {[
                controller.reviewRows.length > 0
                  ? `${controller.reviewRows.length.toLocaleString()} potential ${controller.reviewRows.length === 1 ? "match" : "matches"}`
                  : null,
                controller.remainingIssueCount > 0
                  ? `${controller.remainingIssueCount.toLocaleString()} spreadsheet ${controller.remainingIssueCount === 1 ? "item" : "items"}`
                  : null,
              ]
                .filter(Boolean)
                .join(" and ")}{" "}
              remain to review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const kind = pendingDownload;
                setPendingDownload(null);
                if (kind) void controller.downloadResults(kind);
              }}
            >
              Download anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
