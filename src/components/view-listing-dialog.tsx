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

  const setViewingId = (id: string | null) => {
    try {
      const url = new URL(window.location.href);

      if (id) {
        url.searchParams.set("viewing", id);
      } else {
        url.searchParams.delete("viewing");
      }

      // Use replace instead of push to avoid history stack issues
      router.replace(url.pathname + url.search, { scroll: false });
    } catch (error) {
      console.error("Failed to update URL:", error);
    }
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
        <ErrorBoundary
          fallback={<ErrorFallback resetErrorBoundary={closeViewListing} />}
          onError={logError}
        >
          <Suspense fallback={<ListingDisplaySkeleton />}>
            {viewingId && <ListingDisplay listingId={viewingId} />}
          </Suspense>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
