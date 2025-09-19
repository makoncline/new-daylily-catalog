"use client";

import { useMemo, useState } from "react";
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
import { api } from "@/trpc/react";
import { AhsListingDisplayTwo } from "./ahs-listing-display-two";

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
    | { id: string; name?: string | null; hybridizer?: string | null; year?: number | null }
    | null
  >(null);
  const [isPending, setIsPending] = useState(false);
  const [search, setSearch] = useState("");
  const enabled = search.trim().length >= 3;
  const { data: searchResults = [], isLoading: isSearching } =
    api.dashboardTwo.searchAhs.useQuery(
      { query: search.trim() },
      { enabled },
    );
  const selectedId = selectedAhsListing?.id ?? "";
  const { data: selectedAhsDetailed } = api.dashboardTwo.getAhsById.useQuery(
    { id: selectedId },
    { enabled: !!selectedId },
  );

  const syncTitleWithAhs = () => {
    if (selectedAhsListing) setTitle(selectedAhsListing.name ?? "");
  };

  const handleCreate = async () => {
    setIsPending(true);
    try {
      const finalTitle = title || selectedAhsListing?.name || "New Listing";
      await onCreate({ title: finalTitle, ahsId: selectedAhsListing?.id ?? null });
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
            Create a new daylily listing by providing a title or selecting from the AHS database.
          </P>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ahs-listing">AHS Database Listing (optional)</Label>
            <Input
              id="ahs-listing"
              placeholder="Search AHS by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={disabled}
            />
            {enabled && (
              <div className="rounded-md border p-2 text-sm">
                {isSearching ? (
                  <div className="text-muted-foreground">Loading…</div>
                ) : searchResults.length ? (
                  <ul className="space-y-1">
                    {searchResults.map((r) => (
                      <li
                        key={r.id}
                        className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 hover:bg-muted/50"
                        onClick={() => {
                          setSelectedAhsListing({
                            id: r.id,
                            name: r.name ?? null,
                            hybridizer: r.hybridizer ?? null,
                            year: (r as any).year ?? null,
                          });
                          if (!title) setTitle(r.name ?? "");
                          setSearch("");
                        }}
                      >
                        <div>
                          <span className="font-medium">{r.name ?? "(no name)"}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{r.id}</span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {(r as any).hybridizer ?? ""} {(r as any).year ? `• ${(r as any).year}` : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-muted-foreground">No results</div>
                )}
              </div>
            )}

            {selectedAhsListing && (
              <div className="mt-4">
                <Separator className="my-4" />
                {selectedAhsDetailed && (
                  <div
                    className="rounded-xl border bg-card text-card-foreground shadow-sm"
                    data-testid="linked-ahs-card"
                  >
                    <div className="p-6">
                      <AhsListingDisplayTwo
                        ahsListing={{
                          id: selectedAhsDetailed.id,
                          name: selectedAhsDetailed.name ?? null,
                          hybridizer: selectedAhsDetailed.hybridizer ?? null,
                          year: selectedAhsDetailed.year ?? null,
                          scapeHeight: (selectedAhsDetailed as any).scapeHeight ?? null,
                          bloomSize: (selectedAhsDetailed as any).bloomSize ?? null,
                          bloomSeason: (selectedAhsDetailed as any).bloomSeason ?? null,
                          form: (selectedAhsDetailed as any).form ?? null,
                          ploidy: (selectedAhsDetailed as any).ploidy ?? null,
                          foliageType: (selectedAhsDetailed as any).foliageType ?? null,
                          bloomHabit: (selectedAhsDetailed as any).bloomHabit ?? null,
                          budcount: (selectedAhsDetailed as any).budcount ?? null,
                          branches: (selectedAhsDetailed as any).branches ?? null,
                          sculpting: (selectedAhsDetailed as any).sculpting ?? null,
                          foliage: (selectedAhsDetailed as any).foliage ?? null,
                          flower: (selectedAhsDetailed as any).flower ?? null,
                          fragrance: (selectedAhsDetailed as any).fragrance ?? null,
                          parentage: (selectedAhsDetailed as any).parentage ?? null,
                          color: (selectedAhsDetailed as any).color ?? null,
                          ahsImageUrl: (selectedAhsDetailed as any).ahsImageUrl ?? null,
                        }}
                      />
                    </div>
                  </div>
                )}
                <Separator className="my-4" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="title">Listing Title</Label>
              {selectedAhsListing && (
                <Button type="button" variant="ghost" size="sm" onClick={syncTitleWithAhs} disabled={disabled}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={disabled}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={disabled || (!title && !selectedAhsListing)}>
            Create Listing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
