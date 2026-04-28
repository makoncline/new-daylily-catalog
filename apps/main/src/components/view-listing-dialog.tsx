"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { normalizeError, reportError } from "@/lib/error-utils";
import {
  ListingDisplay,
  ListingDisplaySkeleton,
} from "@/components/listing-display";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { type RouterOutputs } from "@/trpc/react";
import { withPublicClientQueryCache } from "@/lib/cache/client-cache";
import { useListingDialogQueryState } from "@/hooks/use-listing-dialog-query-state";

type Listing = RouterOutputs["public"]["getListings"][number];

export const useViewListing = () => {
  const { viewingId, openListing, closeListing } =
    useListingDialogQueryState();

  return {
    viewListing: (listing: Listing) => {
      openListing(listing.id);
    },
    closeViewListing: closeListing,
    viewingId,
  };
};

interface ViewListingDialogProps {
  listings: Listing[];
}

export function ViewListingDialog({ listings }: ViewListingDialogProps) {
  const { viewingId, closeListing } = useListingDialogQueryState();
  const params = useParams<{ userSlugOrId: string }>();
  const isOpen = !!viewingId;

  const currentListing = viewingId
    ? listings.find((listing) => listing.id === viewingId)
    : null;
  const shouldFetchViewingListing =
    Boolean(viewingId) && !currentListing && Boolean(params.userSlugOrId);

  const listingQuery = api.public.getListing.useQuery(
    {
      userSlugOrId: params.userSlugOrId ?? "",
      listingSlugOrId: viewingId ?? "",
    },
    withPublicClientQueryCache({
      enabled: shouldFetchViewingListing,
      retry: false,
    }),
  );

  const displayListing = currentListing ?? listingQuery.data ?? null;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeListing();
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
          fallback={<ErrorFallback resetErrorBoundary={closeListing} />}
          onError={(error, errorInfo) =>
            reportError({
              error: normalizeError(error),
              context: {
                source: "ViewListingDialog",
                errorInfo,
              },
            })
          }
        >
          {displayListing ? (
            <ListingDisplay listing={displayListing} />
          ) : shouldFetchViewingListing && !listingQuery.error ? (
            <ListingDisplaySkeleton />
          ) : (
            <div className="py-4 text-center">Listing not found</div>
          )}
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
