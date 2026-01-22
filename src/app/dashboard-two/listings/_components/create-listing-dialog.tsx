"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { P } from "@/components/typography";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AhsListingSelectTwo } from "./ahs-listing-select-two";
import type { RouterOutputs } from "@/trpc/react";

export function CreateListingDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: { title: string; ahsId?: string | null }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [selectedAhsListing, setSelectedAhsListing] = useState<
    RouterOutputs["dashboardTwo"]["searchAhs"][number] | null
  >(null);
  const [isPending, setIsPending] = useState(false);

  const syncTitleWithAhs = () => {
    if (selectedAhsListing) setTitle(selectedAhsListing.name ?? "");
  };

  const handleCreate = async () => {
    setIsPending(true);
    try {
      const finalTitle =
        title?.trim() || selectedAhsListing?.name?.trim() || "New Listing";
      await onCreate({
        title: finalTitle,
        ahsId: selectedAhsListing?.id ?? null,
      });
      toast.success("Listing created", { description: finalTitle });
      onOpenChange(false);
      setTitle("");
      setSelectedAhsListing(null);
    } finally {
      setIsPending(false);
    }
  };

  const disabled = isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Listing</DialogTitle>
          <P className="text-muted-foreground text-sm">
            Create a new daylily listing by providing a title or selecting from
            the AHS database.
          </P>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ahs-listing-select">
              AHS Database Listing (optional)
            </Label>
            <AhsListingSelectTwo
              onSelect={(ahs) => {
                setSelectedAhsListing(ahs);
                if (!title) setTitle(ahs.name ?? "");
              }}
              disabled={disabled}
            />

            {selectedAhsListing && (
              <div className="mt-4">
                <Separator className="my-4" />
                <div
                  className="bg-card text-card-foreground rounded-xl border shadow-sm"
                  data-testid="linked-ahs-card"
                >
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <div className="font-medium">
                          {selectedAhsListing.name ?? "Unnamed"}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {selectedAhsListing.hybridizer ?? ""}
                          {selectedAhsListing.year
                            ? ` • ${selectedAhsListing.year}`
                            : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <Separator className="my-4" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="title">Listing Title</Label>
              {selectedAhsListing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={syncTitleWithAhs}
                  disabled={disabled}
                >
                  Sync with AHS name
                </Button>
              )}
            </div>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={selectedAhsListing?.name ?? "Enter a title"}
              disabled={disabled}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={disabled}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={disabled || (!title && !selectedAhsListing)}
          >
            Create Listing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
