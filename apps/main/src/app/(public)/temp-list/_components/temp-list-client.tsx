"use client";

import { useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Textarea } from "@/components/ui/textarea";
import type { CultivarMatchCandidate } from "@/lib/catalog-importer";
import { getQueryClient } from "@/trpc/query-client";
import {
  createTempListing,
  getTempCultivarQueryKey,
  matchTempListings,
  MAX_TEMP_LISTINGS,
  toTempPreviewRow,
  type TempListing,
} from "../_lib/temp-list";
import {
  getTempListServerSnapshot,
  getTempListSnapshot,
  subscribeToTempList,
  writeTempList,
} from "../_lib/temp-list-store";
import { TempListCultivarSearch } from "./temp-list-cultivar-search";
import { TempListEditor } from "./temp-list-editor";
import { TempListPreview } from "./temp-list-preview";

export function TempListClient() {
  const { listings, storageError, ready } = useSyncExternalStore(
    subscribeToTempList,
    getTempListSnapshot,
    getTempListServerSnapshot,
  );
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState("single");
  const [names, setNames] = useState("");
  const [editing, setEditing] = useState<TempListing | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const queryClient = getQueryClient();
  const linked = listings.filter((listing) => listing.cultivarReferenceId);
  const details = useQuery(
    {
      queryKey: getTempCultivarQueryKey(listings),
      queryFn: async ({ signal }) => {
        const results = await matchTempListings(linked, signal);
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
  const loadError = error ?? details.error?.message;

  function save(next: TempListing[], found: CultivarMatchCandidate[] = []) {
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
    writeTempList(next);
  }

  async function addNames() {
    const added = names
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean)
      .map(createTempListing);
    if (!added.length) return;
    if (listings.length + added.length > MAX_TEMP_LISTINGS) {
      toast.error(
        `A temp list can contain up to ${MAX_TEMP_LISTINGS} flowers.`,
      );
      return;
    }
    if (added.some((row) => row.name.length > 160)) {
      toast.error("Each name must be 160 characters or fewer.");
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const results = await matchTempListings(added);
      save(
        [
          ...listings,
          ...added.map((row, index) => ({
            ...row,
            cultivarReferenceId:
              results[index]?.exactMatch?.cultivarReferenceId ?? null,
          })),
        ],
        results.flatMap((result) =>
          result.exactMatch ? [result.exactMatch] : [],
        ),
      );
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
      setAdding(false);
    }
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
    <div className="flex flex-col gap-6">
      {storageError ? (
        <Alert variant="destructive">
          <AlertTitle>Browser storage unavailable</AlertTitle>
          <AlertDescription>{storageError}</AlertDescription>
        </Alert>
      ) : null}
      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load cultivar details</AlertTitle>
          <AlertDescription>
            {loadError} Reload the page to retry saved cultivar links. Your
            listing fields are still here.
          </AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Add flowers</CardTitle>
          <CardDescription>
            Search for a cultivar, or input a batch of names. Each list can
            contain up to {MAX_TEMP_LISTINGS} flowers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <ToggleGroup
              type="single"
              variant="outline"
              value={inputMode}
              onValueChange={(value) => {
                if (value) setInputMode(value);
              }}
              className="justify-start"
              aria-label="Input mode"
            >
              <ToggleGroupItem value="single">Single cultivar</ToggleGroupItem>
              <ToggleGroupItem value="batch">Input batch</ToggleGroupItem>
            </ToggleGroup>
            {inputMode === "single" ? (
              <TempListCultivarSearch
                disabled={
                  !ready || busy || listings.length >= MAX_TEMP_LISTINGS
                }
                onSelect={(cultivar) => {
                  save(
                    [
                      ...listings,
                      {
                        ...createTempListing(cultivar.displayName),
                        cultivarReferenceId: cultivar.cultivarReferenceId,
                      },
                    ],
                    [cultivar],
                  );
                  toast.success(`${cultivar.displayName} added.`);
                }}
              />
            ) : (
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
                    <FieldDescription>
                      Enter one cultivar name per line. Exact names link to the
                      database automatically.
                    </FieldDescription>
                  </Field>
                </FieldGroup>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={!ready || busy || !names.trim()}
                  >
                    <Plus data-icon="inline-start" />
                    {busy ? "Loading cultivars…" : "Add names"}
                  </Button>
                </div>
              </form>
            )}
            <Button
              type="button"
              variant="outline"
              className="self-start"
              disabled={!ready || busy || listings.length >= MAX_TEMP_LISTINGS}
              onClick={() => setEditing(createTempListing(""))}
            >
              Add listing manually
            </Button>
          </div>
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
              ? (matches?.[editing.cultivarReferenceId] ?? null)
              : null
          }
          onClose={() => setEditing(null)}
          onSave={(listing, match) => {
            save(
              listings.some((row) => row.id === listing.id)
                ? listings.map((row) => (row.id === listing.id ? listing : row))
                : [...listings, listing],
              match ? [match] : [],
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
