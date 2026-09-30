"use client";

import { useEffect, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { CultivarMatchCandidate } from "@/lib/catalog-importer";
import {
  createTempListing,
  matchTempListings,
  TEMP_LIST_STORAGE_KEY,
  tempListSchema,
  toTempPreviewRow,
  type TempListing,
} from "../_lib/temp-list";
import { TempListEditor } from "./temp-list-editor";
import { TempListPreview } from "./temp-list-preview";

export function TempListClient() {
  const [listings, setListings] = useState<TempListing[]>([]);
  const [matches, setMatches] = useState<
    Record<string, CultivarMatchCandidate>
  >({});
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [names, setNames] = useState("");
  const [editing, setEditing] = useState<TempListing | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    const abort = new AbortController();
    async function load() {
      let saved: TempListing[] = [];
      try {
        const raw = localStorage.getItem(TEMP_LIST_STORAGE_KEY);
        if (raw) saved = tempListSchema.parse(JSON.parse(raw));
      } catch {
        setStorageError(
          "The saved list could not be read. You can still use this page and download your list.",
        );
      }
      setListings(saved);
      setReady(true);
      const linked = saved.filter(
        (listing) => listing.cultivarReferenceId !== null,
      );
      if (!linked.length) return;
      setBusy(true);
      try {
        const results = await matchTempListings(linked, abort.signal);
        if (!abort.signal.aborted)
          setMatches(
            Object.fromEntries(
              results.flatMap((result, index) => {
                const match = result.exactMatch;
                return match &&
                  linked[index]?.cultivarReferenceId ===
                    match.cultivarReferenceId
                  ? [[match.cultivarReferenceId, match]]
                  : [];
              }),
            ),
          );
      } catch (failure) {
        if (!abort.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not load cultivar details.",
          );
      } finally {
        if (!abort.signal.aborted) setBusy(false);
      }
    }
    void load();
    return () => abort.abort();
  }, []);

  function save(next: TempListing[]) {
    setListings(next);
    try {
      localStorage.setItem(TEMP_LIST_STORAGE_KEY, JSON.stringify(next));
      setStorageError(null);
    } catch {
      setStorageError(
        "This browser could not save the list. Download it before you leave this page.",
      );
    }
  }

  async function addNames() {
    const added = names
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean)
      .map(createTempListing);
    if (!added.length) return;
    if (added.some((row) => row.name.length > 160)) {
      toast.error("Each name must be 160 characters or fewer.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const results = await matchTempListings(added);
      const newMatches = results.flatMap((result) =>
        result.exactMatch
          ? [
              [
                result.exactMatch.cultivarReferenceId,
                result.exactMatch,
              ] as const,
            ]
          : [],
      );
      setMatches((current) => ({
        ...current,
        ...Object.fromEntries(newMatches),
      }));
      save([
        ...listings,
        ...added.map((row, index) => ({
          ...row,
          cultivarReferenceId:
            results[index]?.exactMatch?.cultivarReferenceId ?? null,
        })),
      ]);
      setNames("");
      toast.success(
        `${added.length} ${added.length === 1 ? "listing added" : "listings added"}.`,
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not find cultivar details. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const rows = listings.map((listing) =>
    toTempPreviewRow(
      listing,
      listing.cultivarReferenceId
        ? (matches[listing.cultivarReferenceId] ?? null)
        : null,
    ),
  );
  return (
    <div className="flex flex-col gap-6">
      {storageError ? (
        <Alert variant="destructive">
          <AlertTitle>Browser storage unavailable</AlertTitle>
          <AlertDescription>{storageError}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load cultivar details</AlertTitle>
          <AlertDescription>
            {error} Reload the page to retry saved cultivar links. Your listing
            fields are still here.
          </AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Add flowers</CardTitle>
          <CardDescription>
            Paste cultivar names, one per line. Exact names link to the database
            automatically. You can review other names yourself.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void addNames();
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="temp-names">Cultivar names</FieldLabel>
                <Textarea
                  id="temp-names"
                  rows={3}
                  placeholder={
                    "Millions of Peaches\nViva Glam Girl\nDeep Impact"
                  }
                  value={names}
                  maxLength={100000}
                  disabled={!ready || busy}
                  onChange={(event) => setNames(event.target.value)}
                />
              </Field>
            </FieldGroup>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!ready || busy || !names.trim()}>
                <Plus data-icon="inline-start" />
                {busy ? "Loading cultivars…" : "Add names"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!ready || busy}
                onClick={() => setEditing(createTempListing(""))}
              >
                Add listing manually
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Your list{" "}
            <span className="text-muted-foreground font-normal">
              ({listings.length})
            </span>
          </h2>
          <p role="status" className="text-muted-foreground mt-1 text-sm">
            {!ready
              ? "Loading saved list…"
              : busy
                ? "Loading registered details…"
                : storageError
                  ? "Changes are not saved."
                  : "Saved in this browser. Use downloads to keep a copy."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!listings.length || busy}
          onClick={() => setResetOpen(true)}
        >
          <RotateCcw data-icon="inline-start" />
          Reset list
        </Button>
      </div>
      <TempListPreview rows={rows} busy={!ready || busy} onEdit={setEditing} />
      {editing ? (
        <TempListEditor
          key={editing.id}
          listing={editing}
          initialMatch={
            editing.cultivarReferenceId
              ? (matches[editing.cultivarReferenceId] ?? null)
              : null
          }
          onClose={() => setEditing(null)}
          onSave={(listing, match) => {
            if (match)
              setMatches((current) => ({
                ...current,
                [match.cultivarReferenceId]: match,
              }));
            save(
              listings.some((row) => row.id === listing.id)
                ? listings.map((row) => (row.id === listing.id ? listing : row))
                : [...listings, listing],
            );
            setEditing(null);
          }}
          onRemove={
            listings.some((row) => row.id === editing.id)
              ? () => {
                  const previous = listings;
                  save(listings.filter((row) => row.id !== editing.id));
                  setEditing(null);
                  toast("Listing removed", {
                    action: { label: "Undo", onClick: () => save(previous) },
                  });
                }
              : undefined
          }
        />
      ) : null}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset your temp list?</DialogTitle>
            <DialogDescription>
              This removes all {listings.length} listings from this browser.
              Download a copy first if you want to keep them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const previous = listings;
                save([]);
                setResetOpen(false);
                toast("List reset", {
                  action: { label: "Undo", onClick: () => save(previous) },
                });
              }}
            >
              Reset to empty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
