"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AhsListingDisplay } from "@/components/ahs-listing-display";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CultivarMatchCandidate } from "@/lib/catalog-importer";
import { requestCultivarMatches } from "@/lib/catalog-importer-match-client";
import {
  getCandidateAhsDisplayListing,
  getCandidateMeta,
} from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";
import type { TempListing } from "../_lib/temp-list";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";

export function TempListEditor({
  listing,
  initialMatch,
  onClose,
  onSave,
  onRemove,
}: {
  listing: TempListing;
  initialMatch: CultivarMatchCandidate | null;
  onClose: () => void;
  onSave: (listing: TempListing, match: CultivarMatchCandidate | null) => void;
  onRemove?: () => void;
}) {
  const [draft, setDraft] = useState(listing);
  const [match, setMatch] = useState(initialMatch);
  const [query, setQuery] = useState(listing.name);
  const [candidates, setCandidates] = useState<CultivarMatchCandidate[] | null>(
    null,
  );
  const [finding, setFinding] = useState(false);

  async function findCultivar() {
    if (!query.trim()) return;
    setFinding(true);
    try {
      const [result] = await requestCultivarMatches({
        names: [query.trim()],
        includeCandidates: true,
      });
      setCandidates(
        result
          ? [result.exactMatch, ...result.candidates].filter(
              (candidate, index, all): candidate is CultivarMatchCandidate =>
                Boolean(candidate) &&
                all.findIndex(
                  (item) =>
                    item?.cultivarReferenceId ===
                    candidate?.cultivarReferenceId,
                ) === index,
            )
          : [],
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not find cultivars.",
      );
    } finally {
      setFinding(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-svh overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{onRemove ? "Edit listing" : "Add listing"}</DialogTitle>
          <DialogDescription>
            Saved only in this browser. Link a cultivar to include its photo and
            registered details.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(
              {
                ...draft,
                name: draft.name.trim(),
                cultivarReferenceId:
                  match?.cultivarReferenceId ?? draft.cultivarReferenceId,
              },
              match,
            );
          }}
        >
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="temp-name">Name</FieldLabel>
                <Input
                  id="temp-name"
                  value={draft.name}
                  required
                  maxLength={160}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="temp-price">Price ($)</FieldLabel>
                <Input
                  id="temp-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.price ?? ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      price:
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                    })
                  }
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="temp-description">Description</FieldLabel>
              <Textarea
                id="temp-description"
                rows={3}
                value={draft.description}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
              />
              <FieldDescription>
                Included in the spreadsheet and card PDF.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="temp-note">Private note</FieldLabel>
              <Textarea
                id="temp-note"
                rows={2}
                value={draft.privateNote}
                onChange={(event) =>
                  setDraft({ ...draft, privateNote: event.target.value })
                }
              />
              <FieldDescription>
                Included in the spreadsheet only.
              </FieldDescription>
            </Field>
          </FieldGroup>
          <section
            className="flex flex-col gap-3 border-t pt-4"
            aria-label="Cultivar link"
          >
            <h3 className="font-semibold">
              {match ? `Linked to ${match.displayName}` : "Find a cultivar"}
            </h3>
            {match ? (
              <>
                <AhsListingDisplay
                  ahsListing={getCandidateAhsDisplayListing(match)}
                  cultivarHref={`/cultivar/${toCultivarRouteSegment(match.normalizedName)}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => {
                    setMatch(null);
                    setDraft({ ...draft, cultivarReferenceId: null });
                  }}
                >
                  Remove cultivar link
                </Button>
              </>
            ) : null}
            <Field>
              <FieldLabel htmlFor="temp-cultivar-query">
                Cultivar name
              </FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="temp-cultivar-query"
                  maxLength={160}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void findCultivar();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={finding || !query.trim()}
                  onClick={() => void findCultivar()}
                >
                  {finding ? "Searching…" : "Find cultivar"}
                </Button>
              </div>
            </Field>
            {candidates?.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No cultivar found. Try another name, or save this listing
                without a link.
              </p>
            ) : null}
            {candidates && candidates.length > 0 ? (
              <div
                className="flex flex-col gap-2"
                aria-label="Cultivar matches"
              >
                {candidates.map((candidate) => (
                  <Button
                    key={candidate.cultivarReferenceId}
                    variant="outline"
                    type="button"
                    className="h-auto justify-start text-left whitespace-normal"
                    onClick={() => {
                      setMatch(candidate);
                      setDraft({
                        ...draft,
                        cultivarReferenceId: candidate.cultivarReferenceId,
                        name: candidate.displayName,
                      });
                      setCandidates(null);
                    }}
                  >
                    <span className="flex flex-col gap-1">
                      <span>{candidate.displayName}</span>
                      <span className="text-muted-foreground text-xs">
                        {getCandidateMeta(candidate)}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
            ) : null}
          </section>
          <DialogFooter>
            {onRemove ? (
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                onClick={onRemove}
              >
                Remove listing
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!draft.name.trim() || finding}>
              Save listing
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
