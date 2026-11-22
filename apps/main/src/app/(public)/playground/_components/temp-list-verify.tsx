"use client";

import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/utils";
import type { CultivarMatchCandidate } from "@/lib/catalog-importer";
import type {
  TempListing,
  TempImportIssue,
  TempListingDraft,
} from "../_lib/temp-list";

import type { TempReviewRow } from "../_lib/temp-list-review";
import { MatchReviewTable, IssueReviewTable } from "./temp-list-review-rows";

function listingFields(listing: TempListing) {
  return [
    {
      label: "Price",
      value: listing.price === null ? "" : formatPrice(listing.price),
    },
    { label: "Description", value: listing.description },
    { label: "Private note", value: listing.privateNote },
    { label: "Lists", value: (listing.lists ?? []).join(", ") },
    ...(listing.extraFields ?? []),
  ].filter(({ value }) => value.trim());
}

function ReviewTable({
  rows,
  disabled,
  onRemove,
}: {
  rows: TempReviewRow[];
  disabled: boolean;
  onRemove: (id: string) => void;
}) {
  const fields = rows.map(({ listing }) => listingFields(listing));
  const columns = [
    ...new Set(fields.flatMap((row) => row.map(({ label }) => label))),
  ];
  return (
    <Table variant="outline" aria-label="Reviewed entries">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          {columns.map((label) => (
            <TableHead key={label} className="whitespace-nowrap">
              {label}
            </TableHead>
          ))}
          <TableHead>
            <span className="sr-only">Remove</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={row.listing.id}>
            <TableCell className="min-w-40">
              <span className="font-medium">{row.listing.name}</span>
            </TableCell>
            {columns.map((label) => (
              <TableCell
                key={label}
                className="max-w-64 min-w-24 break-words whitespace-pre-wrap"
              >
                {fields[index]
                  ?.filter((field) => field.label === label)
                  .map((field) => field.value)
                  .join(" · ")}
              </TableCell>
            ))}
            <TableCell className="w-px">
              <Button
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label={`Remove ${row.listing.name} from batch`}
                onClick={() => onRemove(row.listing.id)}
              >
                <X />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function TempListVerify({
  rows,
  issues,
  duplicates,
  disabled,
  remaining,
  onAccept,
  onKeepUnlinked,
  onRecheck,
  onEditName,
  onCorrectIssue,
  onEditIssue,
  onRemove,
  onRemoveIssue,
  onAddReady,
  onClear,
}: {
  rows: TempReviewRow[];
  issues: TempImportIssue[];
  duplicates: ReadonlySet<string>;
  disabled: boolean;
  remaining: number;
  onAccept: (id: string, candidate: CultivarMatchCandidate) => void;
  onKeepUnlinked: (id: string) => void;
  onEditName: (id: string, name: string) => void;
  onEditIssue: (id: string, draft: TempListingDraft) => void;
  onRecheck: (id: string, name: string) => Promise<void>;
  onCorrectIssue: (
    issue: TempImportIssue,
    draft: TempListingDraft,
  ) => Promise<void>;
  onRemove: (id: string) => void;
  onRemoveIssue: (id: string) => void;
  onAddReady: () => void;
  onClear: () => void;
}) {
  const unique = rows.filter((row) => !duplicates.has(row.listing.id));
  const ready = unique.filter(
    (row) => row.match !== null || row.keepUnlinked === true,
  );
  const potential = unique.filter(
    (row) => !row.match && !row.keepUnlinked && row.candidates.length,
  );
  const unmatched = unique.filter(
    (row) => !row.match && !row.keepUnlinked && !row.candidates.length,
  );
  const skipped = rows.filter((row) => duplicates.has(row.listing.id));
  const unresolved = potential.length + unmatched.length + issues.length;
  const matchActions = {
    disabled,
    onAccept,
    onKeepUnlinked,
    onRecheck,
    onEditName,
    onRemove,
  };
  return (
    <section className="flex min-w-0 flex-col gap-6" aria-label="Verify names">
      {ready.length ? (
        <Collapsible defaultOpen={!unresolved} asChild>
          <section className="flex min-w-0 flex-col gap-2" aria-label="Ready">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="group focus-visible:outline-ring flex items-center gap-2 rounded-sm text-left focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-50"
                    disabled={disabled}
                  >
                    Ready ({ready.length})
                    <ChevronDown
                      aria-hidden="true"
                      className="size-4 transition-transform group-data-[state=open]:rotate-180"
                    />
                  </button>
                </CollapsibleTrigger>
              </h2>
              <Button
                disabled={disabled || ready.length > remaining}
                onClick={onAddReady}
              >
                Add ready
              </Button>
            </div>
            <CollapsibleContent>
              <ReviewTable
                rows={ready}
                disabled={disabled}
                onRemove={onRemove}
              />
            </CollapsibleContent>
          </section>
        </Collapsible>
      ) : null}
      {potential.length ? (
        <section
          className="flex min-w-0 flex-col gap-2"
          aria-label="Potential matches"
        >
          <h2 className="text-lg font-semibold">
            Potential matches ({potential.length})
          </h2>
          <MatchReviewTable rows={potential} {...matchActions} />
        </section>
      ) : null}
      {unmatched.length ? (
        <section className="flex min-w-0 flex-col gap-2" aria-label="No match">
          <h2 className="text-lg font-semibold">
            No match ({unmatched.length})
          </h2>
          <MatchReviewTable rows={unmatched} {...matchActions} />
        </section>
      ) : null}
      {issues.length ? (
        <section
          className="flex min-w-0 flex-col gap-2"
          aria-label="Invalid data"
        >
          <h2 className="text-lg font-semibold">
            Invalid data ({issues.length})
          </h2>
          <IssueReviewTable
            issues={issues}
            disabled={disabled}
            onCorrect={onCorrectIssue}
            onEdit={onEditIssue}
            onRemove={onRemoveIssue}
          />
        </section>
      ) : null}
      {skipped.length ? (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="group" disabled={disabled}>
              {skipped.length}{" "}
              {skipped.length === 1 ? "duplicate" : "duplicates"} · skipped
              <ChevronDown
                data-icon="inline-end"
                className="transition-transform group-data-[state=open]:rotate-180"
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <ReviewTable
              rows={skipped}
              disabled={disabled}
              onRemove={onRemove}
            />
          </CollapsibleContent>
        </Collapsible>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        {ready.length > remaining ? (
          <p role="alert">
            There is room for {remaining} more flowers. Remove rows before
            adding this batch.
          </p>
        ) : null}
        <Button variant="ghost" disabled={disabled} onClick={onClear}>
          Clear batch
        </Button>
        {unresolved ? (
          <span className="text-muted-foreground text-sm">
            {unresolved} {unresolved === 1 ? "needs" : "need"} review
          </span>
        ) : null}
      </div>
    </section>
  );
}
