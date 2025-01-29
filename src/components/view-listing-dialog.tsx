"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { logError } from "@/lib/error-utils";
import {
  ListingDisplay,
  ListingDisplaySkeleton,
} from "@/components/listing-display";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export const useViewListing = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());

  const setViewingId = (id: string | null) => {
    if (id) {
      params.set("viewing", id);
    } else {
      params.delete("viewing");
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const getViewingId = () => searchParams.get("viewing");

  return {
    viewListing: (id: string) => {
      setViewingId(id);
    },
    closeViewListing: () => {
      setViewingId(null);
    },
    viewingId: getViewingId(),
  };
};

export function ViewListingDialog() {
  const { viewingId, closeViewListing } = useViewListing();
  const isOpen = !!viewingId;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeViewListing();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>View Listing</DialogTitle>
            <DialogDescription>View your listing here.</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>
        {viewingId && (
          <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={closeViewListing}
            onError={logError}
          >
            <Suspense fallback={<ListingDisplaySkeleton />}>
              <ListingDisplay listingId={viewingId} />
            </Suspense>
          </ErrorBoundary>
        )}
      </DialogContent>
    </Dialog>
  );
}
