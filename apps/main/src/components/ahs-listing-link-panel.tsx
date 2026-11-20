"use client";

import type { ComponentProps, ReactNode } from "react";
import { AhsListingDisplay } from "./ahs-listing-display";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AhsDisplayProps = ComponentProps<typeof AhsListingDisplay>;

export function AhsListingLinkPanel({
  linkedAhs,
  listingName,
  isSaving = false,
  onSyncName,
  onUnlink,
  children,
  ...displayProps
}: Omit<AhsDisplayProps, "ahsListing"> & {
  linkedAhs: AhsDisplayProps["ahsListing"] | null;
  listingName: string | null;
  isSaving?: boolean;
  onSyncName: () => void;
  onUnlink: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {linkedAhs ? (
        <Card>
          <CardHeader>
            <CardTitle>Linked to {linkedAhs.name}</CardTitle>
            <CardDescription>Data from the AHS database.</CardDescription>
            <div className="flex flex-wrap gap-2">
              {listingName !== linkedAhs.name && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onSyncName}
                  disabled={isSaving}
                >
                  {isSaving ? "Syncing..." : "Sync Name"}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onUnlink}
                disabled={isSaving}
              >
                {isSaving ? "Unlinking..." : "Unlink"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <AhsListingDisplay ahsListing={linkedAhs} {...displayProps} />
          </CardContent>
        </Card>
      ) : (
        children
      )}
    </div>
  );
}
