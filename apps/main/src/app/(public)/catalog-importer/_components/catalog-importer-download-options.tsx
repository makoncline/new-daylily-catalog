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
      <ItemGroup className="gap-6">
        <Item
          className={cn(
            "flex-col items-stretch gap-3 px-0",
            !stacked && "sm:flex-row sm:items-center",
          )}
        >
          <ItemContent className="gap-1">
            <ItemTitle>Prepared file</ItemTitle>
            <ItemDescription className="line-clamp-none">
              Clean data, ready to import
            </ItemDescription>
          </ItemContent>
          <ItemActions className={cn("w-full", !stacked && "sm:w-auto")}>
            <Button
              type="button"
              aria-label="Download prepared import file"
              className={cn("w-full", !stacked && "sm:w-auto sm:min-w-40")}
              disabled={controller.downloadingResults !== null}
              onClick={() => requestDownload("clean")}
            >
              {controller.downloadingResults === "clean" ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Download data-icon="inline-start" />
              )}
              Download
            </Button>
          </ItemActions>
        </Item>
        <Item
          className={cn(
            "flex-col items-stretch gap-3 px-0",
            !stacked && "sm:flex-row sm:items-center",
          )}
        >
          <ItemContent className="gap-1">
            <ItemTitle>Enhanced original</ItemTitle>
            <ItemDescription className="line-clamp-none">
              Your workbook with matches added
            </ItemDescription>
          </ItemContent>
          <ItemActions className={cn("w-full", !stacked && "sm:w-auto")}>
            <Button
              type="button"
              aria-label="Download enhanced original"
              className={cn("w-full", !stacked && "sm:w-auto sm:min-w-40")}
              variant="outline"
              disabled={controller.downloadingResults !== null}
              onClick={() => requestDownload("enriched")}
            >
              {controller.downloadingResults === "enriched" ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Download data-icon="inline-start" />
              )}
              Download
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
