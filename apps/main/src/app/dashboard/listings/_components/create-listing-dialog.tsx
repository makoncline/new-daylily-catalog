"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  AhsListingSelect,
  type AhsSearchResult,
} from "@/components/ahs-listing-select";
import { AhsListingDisplay } from "@/components/ahs-listing-display";
import { Separator } from "@/components/ui/separator";
import { atom, useAtom, useSetAtom } from "jotai";
import { editingListingIdAtom } from "./edit-listing-dialog";
import {
  getErrorMessage,
  normalizeError,
  reportError,
} from "@/lib/error-utils";
import { APP_CONFIG } from "@/config/constants";
import { insertListing } from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";

/**
 * State for the full-page listing creation surface.
 */
export const creatingListingAtom = atom(false);

export function useCreateListing() {
  const [isCreating, setIsCreating] = useAtom(creatingListingAtom);

  return {
    closeCreateListing: () => setIsCreating(false),
    isCreating,
    openCreateListing: () => setIsCreating(true),
  };
}

/**
 * Full-page surface for creating a new daylily listing.
 * Allows selecting an AHS database entry and/or setting a custom title.
 * After successful creation, automatically opens the full-page editor.
 */
export function CreateListingSurface({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [selectedResult, setSelectedResult] = useState<AhsSearchResult | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const backButtonRef = useRef<HTMLButtonElement | null>(null);
  const surfaceRef = useRef<HTMLElement | null>(null);

  const setEditingId = useSetAtom(editingListingIdAtom);

  useLayoutEffect(() => {
    backButtonRef.current?.focus({ preventScroll: true });
    const shellElements = [
      ...document.querySelectorAll<HTMLElement>('[data-sidebar="sidebar"]'),
      surfaceRef.current
        ?.closest("main")
        ?.querySelector<HTMLElement>(":scope > header"),
      document.querySelector<HTMLElement>(
        '[data-testid="dashboard-billing-alert"]',
      ),
    ].filter((element): element is HTMLElement => Boolean(element));

    shellElements.forEach((element) => {
      element.inert = true;
    });
    return () => {
      shellElements.forEach((element) => {
        element.inert = false;
      });
    };
  }, []);

  const { data: detailedAhsListing } = api.dashboardDb.ahs.get.useQuery(
    {
      id: selectedResult?.id ?? "",
    },
    {
      enabled: !!selectedResult?.id,
    },
  );

  /**
   * Handles selection of an AHS listing.
   * If title is empty, automatically uses the AHS listing name.
   */
  const handleAhsListingSelect = (result: AhsSearchResult) => {
    setSelectedResult(result);
    if (!title) {
      setTitle(result.name ?? "");
    }
  };

  /**
   * Syncs the title input with the selected AHS listing name.
   */
  const syncTitleWithAhs = () => {
    if (selectedResult) {
      setTitle(selectedResult.name ?? "");
    }
  };

  /**
   * Handles the create button click.
   * Submits form data to create a new listing.
   */
  const handleCreate = async () => {
    setIsSaving(true);
    try {
      const normalizedTitle = title.trim();
      const selectedName = selectedResult?.name?.trim();
      const finalTitle =
        normalizedTitle.length > 0
          ? normalizedTitle
          : selectedName && selectedName.length > 0
            ? selectedName
            : APP_CONFIG.LISTING.DEFAULT_NAME;

      if (selectedResult && !selectedResult.cultivarReferenceId) {
        toast.error("Selected listing is not available for cultivar link.");
        return;
      }

      const newListing = await insertListing({
        title: finalTitle,
        cultivarReferenceId: selectedResult?.cultivarReferenceId ?? null,
      });

      toast.success("Listing created", {
        description: `${newListing.title} has been created.`,
      });

      onClose();
      setEditingId(newListing.id);
    } catch (error) {
      toast.error("Failed to create listing", {
        description: getErrorMessage(error),
      });
      reportError({
        error: normalizeError(error),
        context: { source: "CreateListingDialog" },
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      ref={surfaceRef}
      aria-label="Create listing"
      className="mx-auto w-full max-w-3xl pb-8"
    >
      <PageHeader
        heading="Create New Listing"
        text="Create a new daylily listing by providing a title or selecting from the AHS database."
      >
        <Button
          ref={backButtonRef}
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSaving}
        >
          <ArrowLeft aria-hidden="true" />
          Back to listings
        </Button>
      </PageHeader>

      <div className="space-y-6 pb-16">
        <div className="space-y-2">
          <Label htmlFor="ahs-listing">AHS Database Listing (optional)</Label>
          <AhsListingSelect
            onSelect={handleAhsListingSelect}
            disabled={isSaving}
          />

          {selectedResult && detailedAhsListing && (
            <div className="mt-4">
              <Separator className="my-4" />
              <AhsListingDisplay
                ahsListing={detailedAhsListing}
                cultivarReferenceImage={
                  detailedAhsListing.cultivarReferenceImage
                }
              />
              <Separator className="my-4" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="title">Listing Title</Label>
            {selectedResult && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={syncTitleWithAhs}
                disabled={isSaving}
              >
                Sync with AHS name
              </Button>
            )}
          </div>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={selectedResult?.name ?? "Enter a title"}
            disabled={isSaving}
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={isSaving || (!title.trim() && !selectedResult)}
          >
            {isSaving ? (
              <>
                <Spinner aria-hidden="true" />
                Creating…
              </>
            ) : (
              "Create Listing"
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
