"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { reportError } from "@/lib/error-utils";
import { ListingDisplay } from "@/components/listing-display";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { type RouterOutputs } from "@/trpc/react";

type Listing = RouterOutputs["public"]["getListings"][number];

export const useViewListing = () => {
  const searchParams = useSearchParams();
  const listingRef = useRef<Listing | null>(null);

  const setViewingId = (id: string | null) => {
    try {
      const params = new URLSearchParams(searchParams.toString());

      if (id) {
        params.set("viewing", id);
      } else {
        params.delete("viewing");
      }

      window.history.pushState(null, "", `?${params.toString()}`);
    } catch (error) {
      console.error("Failed to update URL:", error);
    }
  };

  const getViewingId = () => searchParams.get("viewing");

  return {
    viewListing: (listing: Listing) => {
      listingRef.current = listing;
      setViewingId(listing.id);
    },
    closeViewListing: () => {
      listingRef.current = null;
      setViewingId(null);
    },
    viewingId: getViewingId(),
  };
};

interface ViewListingDialogProps {
  listings: Listing[];
}

export function ViewListingDialog({ listings }: ViewListingDialogProps) {
  const { viewingId, closeViewListing } = useViewListing();
  const isOpen = !!viewingId;

  const currentListing = viewingId
    ? listings.find((listing) => listing.id === viewingId)
    : null;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeViewListing();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-lg overflow-y-auto"
        onOpenAutoFocus={(e) => {
          // Prevent default focus behavior
          e.preventDefault();
        }}
      >
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>View Listing</DialogTitle>
            <DialogDescription>View your listing here.</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>
        <ErrorBoundary
          fallback={<ErrorFallback resetErrorBoundary={closeViewListing} />}
          onError={(error) => reportError({ error })}
        >
          {currentListing ? (
            <ListingDisplay listing={currentListing} />
          ) : (
            <div className="py-4 text-center">Listing not found</div>
          )}
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
