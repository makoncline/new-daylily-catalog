"use client";

import { useState, useSyncExternalStore, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CultivarMatchCandidate } from "@/lib/catalog-importer";
import { getQueryClient } from "@/trpc/query-client";
import {
  createTempListing,
  validateTempListingDraft,
  toTempListingDraft,
  type TempListingDraft,
  getTempCultivarQueryKey,
  matchTempListings,
  MAX_TEMP_LISTINGS,
  toTempPreviewRow,
  tempListSchema,
  type TempListing,
  type TempInputBatch,
  type TempImportIssue,
} from "../_lib/temp-list";
import {
  getTempListServerSnapshot,
  getTempListSnapshot,
  subscribeToTempList,
  writeTempList,
  restoreTempListings,
  resetTempList,
} from "../_lib/temp-list-store";
import {
  getTempReviewSnapshot,
  getTempReviewServerSnapshot,
  subscribeToTempReview,
  updateTempReview,
  resetTempReview,
} from "../_lib/temp-list-review-store";
import { TempListVerify } from "./temp-list-verify";
import {
  getTempDuplicateIds,
  matchReviewListings,
  type TempReviewRow,
} from "../_lib/temp-list-review";
import { TempListInput } from "./temp-list-input";
import { TempListEditor } from "./temp-list-editor";
import { TempListPreview } from "./temp-list-preview";

function showUndo(message: string, undo: () => boolean) {
  toast(message, {
    duration: 30_000,
    action: {
      label: "Undo",
      onClick: (event) => {
        if (!undo()) event.preventDefault();
      },
    },
  });
}

function updateTempListing(updated: TempListing) {
  const current = getTempListSnapshot().listings;
  const previous = current.find((row) => row.id === updated.id);
  if (
    !writeTempList(
      current.map((row) => (row.id === updated.id ? updated : row)),
    )
  )
    return false;

  if (previous?.cultivarReferenceId && !updated.cultivarReferenceId) {
    showUndo("Cultivar link removed", () =>
      writeTempList(
        getTempListSnapshot().listings.map((row) =>
          row.id === previous.id && !row.cultivarReferenceId
            ? { ...row, cultivarReferenceId: previous.cultivarReferenceId }
            : row,
        ),
      ),
    );
  }
  return true;
}

function removeTempListings(ids: string[]) {
  const current = getTempListSnapshot().listings;
  const removed = current.filter((listing) => ids.includes(listing.id));
  if (!writeTempList(current.filter((listing) => !ids.includes(listing.id))))
    return false;
  showUndo("Removed from Playground", () => restoreTempListings(removed));
  return true;
}

function addTempListingsToList(ids: string[], title: string) {
  return writeTempList(
    getTempListSnapshot().listings.map((listing) =>
      ids.includes(listing.id)
        ? { ...listing, lists: [...new Set([...(listing.lists ?? []), title])] }
        : listing,
    ),
  );
}

export function TempListClient() {
  const { listings, storageError, ready, writeBlocked, recoveryRaw } =
    useSyncExternalStore(
      subscribeToTempList,
      getTempListSnapshot,
      getTempListServerSnapshot,
    );
  const {
    draft,
    ready: reviewReady,
    error: reviewStorageError,
  } = useSyncExternalStore(
    subscribeToTempReview,
    getTempReviewSnapshot,
    getTempReviewServerSnapshot,
  );
  const { review, issues: reviewIssues } = draft;
  function setReview(
    next: TempReviewRow[] | ((rows: TempReviewRow[]) => TempReviewRow[]),
  ) {
    updateTempReview((current) => ({
      ...current,
      review: typeof next === "function" ? next(current.review) : next,
    }));
  }
  function setReviewIssues(
    next:
      | TempImportIssue[]
      | ((issues: TempImportIssue[]) => TempImportIssue[]),
  ) {
    updateTempReview((current) => ({
      ...current,
      issues: typeof next === "function" ? next(current.issues) : next,
    }));
  }
  const duplicates = getTempDuplicateIds(review, listings);
  const uniqueReview = review.filter((row) => !duplicates.has(row.listing.id));
  const reviewSummary =
    review.length || reviewIssues.length
      ? [
          [
            uniqueReview.filter((row) => row.match !== null || row.keepUnlinked)
              .length,
            "ready",
          ],
          [
            uniqueReview.filter(
              (row) => !row.match && row.candidates.length && !row.keepUnlinked,
            ).length,
            "potential",
          ],
          [
            uniqueReview.filter(
              (row) =>
                !row.match && !row.keepUnlinked && !row.candidates.length,
            ).length,
            "no match",
          ],
          [reviewIssues.length, "invalid"],
          [duplicates.size, duplicates.size === 1 ? "duplicate" : "duplicates"],
        ]
          .filter(([count]) => count)
          .map(([count, label]) => `${count} ${label}`)
          .join(" · ")
      : null;
  const [adding, setAdding] = useState(false);
  const checkVersion = useRef(0);
  const pendingCheck = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      checkVersion.current++;
      pendingCheck.current?.abort();
    },
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TempListing | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const queryClient = getQueryClient();
  const linked = listings.filter((listing) => listing.cultivarReferenceId);
  const details = useQuery(
    {
      queryKey: getTempCultivarQueryKey(listings),
      queryFn: async ({ signal }) => {
        const results = await matchTempListings(linked, {
          signal,
          preserveLinks: true,
        });
        return Object.fromEntries(
          results.flatMap((result) =>
            result.exactMatch &&
            result.exactMatch.cultivarReferenceId ===
              result.inputCultivarReferenceId
              ? [[result.exactMatch.cultivarReferenceId, result.exactMatch]]
              : [],
          ),
        );
      },
      enabled: ready && linked.length > 0,
      staleTime: Infinity,
      retry: false,
      retryOnMount: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    queryClient,
  );
  const matches = details.data;
  const busy = adding || details.isFetching;
  const remainingCapacity = Math.max(0, MAX_TEMP_LISTINGS - listings.length);
  const loadError = details.error?.message;

  function clearReview() {
    checkVersion.current++;
    pendingCheck.current?.abort();
    setAdding(false);
    setReview([]);
    setReviewIssues([]);
    setError(null);
  }

  function save(
    next: TempListing[],
    found: CultivarMatchCandidate[] = [],
    keepUnsavedRows = false,
  ) {
    if (getTempListSnapshot().writeBlocked) return false;
    const known = {
      ...matches,
      ...Object.fromEntries(
        found.map((match) => [match.cultivarReferenceId, match]),
      ),
    };
    if (
      next.every(
        (listing) =>
          !listing.cultivarReferenceId || known[listing.cultivarReferenceId],
      )
    ) {
      queryClient.setQueryData(getTempCultivarQueryKey(next), known);
    }
    return writeTempList(next, { keepUnsavedRows });
  }

  async function checkListings({
    listings: added,
    issues = [],
    preserveLinks = false,
    preserveNames = false,
  }: TempInputBatch) {
    if (
      (!added.length && !issues.length) ||
      writeBlocked ||
      added.length + issues.length > remainingCapacity
    )
      return false;
    const version = ++checkVersion.current;
    pendingCheck.current?.abort();
    const controller = new AbortController();
    pendingCheck.current = controller;
    setAdding(true);
    setError(null);
    try {
      added = tempListSchema.parse(added);
      const checked = await matchReviewListings(
        added,
        preserveLinks,
        preserveNames,
        controller.signal,
      );
      if (version !== checkVersion.current) return false;
      setReview(checked.rows);
      setReviewIssues([...issues, ...checked.issues]);
      return true;
    } catch (failure) {
      if (version !== checkVersion.current) return false;
      setError(
        failure instanceof TypeError
          ? "Could not check names. Check your connection, then select Check names again."
          : failure instanceof Error
            ? failure.message
            : "Could not check names. Select Check names again to retry.",
      );
      return false;
    } finally {
      if (version === checkVersion.current) setAdding(false);
    }
  }

  async function recheckName(id: string, name: string) {
    const row = review.find((row) => row.listing.id === id);
    if (!row) return;
    const parsed = validateTempListingDraft({
      ...toTempListingDraft(row.listing),
      name,
      cultivarReferenceId: null,
    });
    if (!parsed.success) {
      setReview((rows) => rows.filter((row) => row.listing.id !== id));
      setReviewIssues((issues) => [
        ...issues,
        { ...parsed.issue, preserveNames: row.preserveName },
      ]);
      return;
    }
    const version = ++checkVersion.current;
    pendingCheck.current?.abort();
    const controller = new AbortController();
    pendingCheck.current = controller;
    setAdding(true);
    setError(null);
    try {
      const checked = await matchReviewListings(
        [parsed.listing],
        false,
        row.preserveName,
        controller.signal,
      );
      if (version !== checkVersion.current) return;
      setReview((current) => [
        ...current.filter((row) => row.listing.id !== id),
        ...checked.rows,
      ]);
      setReviewIssues((current) => [...current, ...checked.issues]);
    } catch {
      if (version === checkVersion.current)
        setError("Could not check this name. Try again.");
    } finally {
      if (version === checkVersion.current) setAdding(false);
    }
  }

  async function correctIssue(issue: TempImportIssue, draft: TempListingDraft) {
    setError(null);
    const parsed = validateTempListingDraft(
      draft,
      issue.rowNumber,
      issue.preserveLinks,
    );
    if (!parsed.success) {
      setReviewIssues((current) =>
        current.map((item) =>
          item.id === issue.id
            ? { ...parsed.issue, preserveNames: issue.preserveNames }
            : item,
        ),
      );
      return;
    }
    const version = ++checkVersion.current;
    pendingCheck.current?.abort();
    const controller = new AbortController();
    pendingCheck.current = controller;
    setAdding(true);
    setError(null);
    try {
      const checked = await matchReviewListings(
        [parsed.listing],
        issue.preserveLinks,
        issue.preserveNames,
        controller.signal,
      );
      if (version !== checkVersion.current) return;
      setReview((current) => [...current, ...checked.rows]);
      setReviewIssues((current) => [
        ...current.filter((item) => item.id !== issue.id),
        ...checked.issues,
      ]);
    } catch {
      if (version === checkVersion.current)
        setError("Could not check this row. Try again.");
    } finally {
      if (version === checkVersion.current) setAdding(false);
    }
  }

  function addReady() {
    if (getTempListSnapshot().writeBlocked) return;
    const added = review.filter(
      (row) =>
        !duplicates.has(row.listing.id) &&
        (row.match !== null || row.keepUnlinked),
    );
    const addedIds = new Set(added.map((row) => row.listing.id));
    const remaining = review.filter(
      (row) => !duplicates.has(row.listing.id) && !addedIds.has(row.listing.id),
    );
    if (listings.length + added.length > MAX_TEMP_LISTINGS) {
      setError(`There is room for ${remainingCapacity} more flowers.`);
      return;
    }
    if (
      !save(
        [...listings, ...added.map(({ listing }) => listing)],
        added.flatMap(({ match }) => (match ? [match] : [])),
      )
    )
      return;
    if (!remaining.length && !reviewIssues.length) resetTempReview();
    else setReview(remaining);

    setError(null);
    toast.success(
      `${added.length} added${duplicates.size ? ` · ${duplicates.size} duplicates skipped` : ""}`,
    );
  }

  const rows = listings.map((listing) =>
    toTempPreviewRow(
      listing,
      listing.cultivarReferenceId
        ? (matches?.[listing.cultivarReferenceId] ?? null)
        : null,
    ),
  );
  return (
    <>
      {storageError && !editing ? (
        <Alert variant="destructive">
          <AlertTitle>Browser storage unavailable</AlertTitle>
          <AlertDescription>
            <p>{storageError}</p>
            {writeBlocked ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={recoveryRaw === null}
                  onClick={() => {
                    const url = URL.createObjectURL(
                      new Blob([recoveryRaw ?? ""], {
                        type: "application/json",
                      }),
                    );
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "playground-saved-data.json";
                    link.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                >
                  Download saved data
                </Button>
                <Button variant="outline" onClick={() => setResetOpen(true)}>
                  Reset saved data
                </Button>
              </div>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className={editing ? "hidden" : "flex flex-col gap-6"}>
        {reviewStorageError ? (
          <Alert variant="destructive">
            <AlertTitle>Review storage unavailable</AlertTitle>
            <AlertDescription>{reviewStorageError}</AlertDescription>
          </Alert>
        ) : null}
        {loadError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load cultivar details</AlertTitle>
            <AlertDescription>
              {loadError}
              <Button
                type="button"
                variant="outline"
                disabled={details.isFetching}
                onClick={() => void details.refetch()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <TempListInput
          onSourceChange={clearReview}
          disabled={!ready || !reviewReady || busy || writeBlocked}
          remaining={remainingCapacity}
          draft={draft}
          onDraftChange={(change) =>
            updateTempReview((current) => ({ ...current, ...change }))
          }
          checking={adding}
          summary={reviewSummary}
          onAdd={checkListings}
          onSelect={(cultivar) => {
            if (
              listings.some(
                (listing) =>
                  listing.cultivarReferenceId === cultivar.cultivarReferenceId,
              )
            ) {
              toast.info("Already in your list");
              return;
            }
            if (listings.length >= MAX_TEMP_LISTINGS) {
              setError(
                `Each catalog can contain ${MAX_TEMP_LISTINGS} flowers.`,
              );
              return;
            }
            if (
              !save(
                [
                  ...listings,
                  {
                    ...createTempListing(cultivar.displayName),
                    cultivarReferenceId: cultivar.cultivarReferenceId,
                  },
                ],
                [cultivar],
                true,
              )
            )
              return;
            setError(null);
            toast.success(`${cultivar.displayName} added`);
          }}
        />
        {review.length > 0 || reviewIssues.length > 0 ? (
          <TempListVerify
            rows={review}
            issues={reviewIssues}
            duplicates={duplicates}
            onRemoveIssue={(id) =>
              setReviewIssues(reviewIssues.filter((issue) => issue.id !== id))
            }
            onKeepUnlinked={(id) =>
              setReview(
                review.map((row) =>
                  row.listing.id === id ? { ...row, keepUnlinked: true } : row,
                ),
              )
            }
            onAccept={(id, candidate) =>
              setReview(
                review.map((row) =>
                  row.listing.id === id
                    ? {
                        ...row,
                        match: candidate,
                        listing: {
                          ...row.listing,
                          name: row.preserveName
                            ? row.listing.name
                            : candidate.displayName,
                          cultivarReferenceId: candidate.cultivarReferenceId,
                        },
                      }
                    : row,
                ),
              )
            }
            onRemove={(id) =>
              setReview(review.filter(({ listing }) => listing.id !== id))
            }
            disabled={busy || writeBlocked}
            remaining={remainingCapacity}
            onEditName={(id, draftName) =>
              setReview((rows) =>
                rows.map((row) =>
                  row.listing.id === id ? { ...row, draftName } : row,
                ),
              )
            }
            onEditIssue={(id, draft) =>
              setReviewIssues((issues) =>
                issues.map((issue) =>
                  issue.id === id ? { ...issue, draft } : issue,
                ),
              )
            }
            onRecheck={recheckName}
            onCorrectIssue={correctIssue}
            onAddReady={addReady}
            onClear={clearReview}
          />
        ) : null}
        {listings.length > 0 ? (
          <section
            className="flex min-w-0 flex-col gap-4 border-t pt-6"
            aria-label="Your catalog"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">
                  Your catalog{" "}
                  <span className="text-muted-foreground font-normal">
                    ({listings.length})
                  </span>
                </h2>
                <p role="status" className="text-muted-foreground mt-1 text-sm">
                  {!ready
                    ? "Loading saved catalog…"
                    : busy
                      ? "Loading registered details…"
                      : storageError
                        ? "Changes are not saved."
                        : "Saved in this browser"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!listings.length || busy}
                  onClick={() => setResetOpen(true)}
                >
                  <RotateCcw data-icon="inline-start" />
                  Reset catalog
                </Button>
              </div>
            </div>
            <TempListPreview
              rows={rows}
              storageError={storageError}
              busy={!ready || busy || writeBlocked}
              onEdit={setEditing}
              onUpdate={updateTempListing}
              onRemove={removeTempListings}
              onAddToList={addTempListingsToList}
            />
          </section>
        ) : null}
      </div>
      {editing ? (
        <TempListEditor
          key={editing.id}
          listing={editing}
          storageError={storageError}
          listOptions={[
            ...new Set(listings.flatMap((row) => row.lists ?? [])),
          ].sort()}
          initialMatch={
            editing.cultivarReferenceId
              ? (matches?.[editing.cultivarReferenceId] ?? null)
              : null
          }
          onClose={() => setEditing(null)}
          onSave={(listing, match) => {
            if (
              save(
                listings.map((row) => (row.id === listing.id ? listing : row)),
                match ? [match] : [],
              )
            )
              setEditing(null);
          }}
          onRemove={
            listings.some((row) => row.id === editing.id)
              ? () => {
                  if (removeTempListings([editing.id])) setEditing(null);
                }
              : undefined
          }
        />
      ) : null}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {writeBlocked
                ? "Reset unreadable saved data?"
                : "Reset your Playground catalog?"}
            </DialogTitle>
            <DialogDescription>
              {writeBlocked
                ? "This removes the unreadable saved data from this browser. Download the saved data first to keep a copy."
                : `This removes all ${listings.length} listings from this browser. Download a copy first to keep them.`}
            </DialogDescription>
          </DialogHeader>
          {storageError && !writeBlocked ? (
            <p role="alert" className="text-destructive text-sm">
              {storageError}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (writeBlocked) {
                  resetTempList();
                  setResetOpen(false);
                  return;
                }
                if (!save([])) return;
                setResetOpen(false);
                showUndo("List reset", () => restoreTempListings(listings));
              }}
            >
              Reset to empty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
