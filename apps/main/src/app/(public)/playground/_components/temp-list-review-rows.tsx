"use client";

import { X } from "lucide-react";
import { CultivarOption } from "@/components/catalog-builder/cultivar-option";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CultivarMatchCandidate } from "@/lib/catalog-importer";
import type {
  TempImportIssue,
  TempImportField,
  TempListingDraft,
} from "../_lib/temp-list";
import type { TempReviewRow } from "../_lib/temp-list-review";

interface MatchActions {
  disabled: boolean;
  onAccept: (id: string, candidate: CultivarMatchCandidate) => void;
  onKeepUnlinked: (id: string) => void;
  onEditName: (id: string, name: string) => void;
  onRecheck: (id: string, name: string) => Promise<void>;
  onRemove: (id: string) => void;
}

function MatchRow({
  row,
  disabled,
  onAccept,
  onKeepUnlinked,
  onRecheck,
  onEditName,
  onRemove,
}: MatchActions & { row: TempReviewRow }) {
  const name = row.draftName ?? row.listing.name;
  const changed = name.trim() !== row.listing.name;
  return (
    <TableRow responsive>
      <TableCell className="col-start-1 row-start-1 align-top sm:w-80 sm:min-w-80">
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim() && changed) void onRecheck(row.listing.id, name);
          }}
        >
          <FieldGroup className="min-w-0">
            <Field>
              <FieldLabel
                htmlFor={`${row.listing.id}-name`}
                className="sr-only"
              >
                Name
              </FieldLabel>
              <Input
                id={`${row.listing.id}-name`}
                aria-label={`Name for ${row.listing.name}`}
                value={name}
                title={name}
                disabled={disabled}
                onChange={(event) =>
                  onEditName(row.listing.id, event.target.value)
                }
              />
            </Field>
          </FieldGroup>
          <Button
            type="submit"
            variant="outline"
            disabled={disabled || !name.trim() || !changed}
          >
            Check
          </Button>
        </form>
        <p className="text-muted-foreground mt-2 text-sm whitespace-pre-wrap">
          {[
            row.listing.price === null ? "" : `$${row.listing.price}`,
            row.listing.description,
            row.listing.privateNote,
            ...(row.listing.extraFields ?? [])
              .filter(({ value }) => value)
              .map(({ label, value }) => `${label} ${value}`),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </TableCell>
      <TableCell className="col-span-2 row-start-2">
        {!changed ? (
          <div className="flex flex-wrap items-center gap-2">
            {row.candidates.slice(0, 3).map((candidate) => (
              <CultivarOption
                key={candidate.cultivarReferenceId}
                cultivar={candidate}
                disabled={disabled}
                aria-label={`${candidate.displayName} ${Math.round(candidate.confidence)}%`}
                onClick={() => onAccept(row.listing.id, candidate)}
              >
                <span title="Name similarity">
                  {Math.round(candidate.confidence)}%
                </span>
              </CultivarOption>
            ))}
            <Button
              variant="ghost"
              disabled={disabled}
              onClick={() => onKeepUnlinked(row.listing.id)}
            >
              Keep unlinked
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Check the edited name.
          </p>
        )}
      </TableCell>
      <TableCell className="col-start-2 row-start-1 align-top sm:w-px">
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
  );
}

export function MatchReviewTable({
  rows,
  ...actions
}: MatchActions & { rows: TempReviewRow[] }) {
  return (
    <Table variant="outline" aria-label="Match review">
      <TableHeader className="hidden sm:table-header-group">
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>
            {rows.some((row) => row.candidates.length)
              ? "Potential matches"
              : "Action"}
          </TableHead>
          <TableHead>
            <span className="sr-only">Remove</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="block sm:table-row-group">
        {rows.map((row) => (
          <MatchRow
            key={`${row.listing.id}-${row.listing.name}`}
            row={row}
            {...actions}
          />
        ))}
      </TableBody>
    </Table>
  );
}

const FIELD_LABELS: Record<TempImportField, string> = {
  name: "Name",
  lists: "Lists",
  price: "Price",
  description: "Description",
  privateNote: "Private note",
  cultivarReferenceId: "Cultivar ID",
};

function IssueRow({
  issue,
  disabled,
  onCorrect,
  onEdit,
  onRemove,
}: {
  issue: TempImportIssue;
  disabled: boolean;
  onCorrect: (issue: TempImportIssue, draft: TempListingDraft) => Promise<void>;
  onEdit: (id: string, draft: TempListingDraft) => void;
  onRemove: (id: string) => void;
}) {
  const draft = issue.draft;
  return (
    <TableRow responsive>
      <TableCell className="col-start-1 row-start-1 break-words sm:min-w-40">
        <span className="font-medium">{issue.name}</span>
      </TableCell>
      <TableCell className="col-span-2 row-start-2 sm:min-w-72">
        <form
          className="flex flex-col items-start gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void onCorrect(issue, draft);
          }}
        >
          <FieldGroup>
            {issue.errors.map(({ field, message }) => (
              <Field key={field} data-invalid>
                <FieldLabel htmlFor={`${issue.id}-${field}`}>
                  {FIELD_LABELS[field]}
                </FieldLabel>
                {field === "description" || field === "privateNote" ? (
                  <Textarea
                    id={`${issue.id}-${field}`}
                    aria-label={`${FIELD_LABELS[field]} for ${issue.name}`}
                    aria-invalid
                    aria-describedby={`${issue.id}-${field}-error`}
                    value={draft[field]}
                    disabled={disabled}
                    onChange={(event) =>
                      onEdit(issue.id, {
                        ...draft,
                        [field]: event.target.value,
                      })
                    }
                  />
                ) : (
                  <Input
                    id={`${issue.id}-${field}`}
                    aria-label={`${FIELD_LABELS[field]} for ${issue.name}`}
                    aria-invalid
                    aria-describedby={`${issue.id}-${field}-error`}
                    inputMode={field === "price" ? "decimal" : undefined}
                    value={
                      field === "lists"
                        ? (draft.lists ?? []).join("; ")
                        : (draft[field] ?? "")
                    }
                    disabled={disabled}
                    onChange={(event) =>
                      onEdit(issue.id, {
                        ...draft,
                        [field]:
                          field === "lists"
                            ? event.target.value
                                .split(";")
                                .map((name) => name.trim())
                                .filter(Boolean)
                            : event.target.value,
                      })
                    }
                  />
                )}
                <FieldError id={`${issue.id}-${field}-error`}>
                  {message}
                </FieldError>
              </Field>
            ))}
          </FieldGroup>
          <Button type="submit" variant="outline" disabled={disabled}>
            Check again
          </Button>
        </form>
      </TableCell>
      <TableCell className="col-start-2 row-start-1 align-top sm:w-px">
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label={`Remove ${issue.name} from batch`}
          onClick={() => onRemove(issue.id)}
        >
          <X />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function IssueReviewTable({
  issues,
  disabled,
  onCorrect,
  onEdit,
  onRemove,
}: {
  issues: TempImportIssue[];
  disabled: boolean;
  onCorrect: (issue: TempImportIssue, draft: TempListingDraft) => Promise<void>;
  onEdit: (id: string, draft: TempListingDraft) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Table variant="outline" aria-label="Invalid entries">
      <TableHeader className="hidden sm:table-header-group">
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Correction</TableHead>
          <TableHead>
            <span className="sr-only">Remove</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="block sm:table-row-group">
        {issues.map((issue) => (
          <IssueRow
            key={issue.id}
            issue={issue}
            disabled={disabled}
            onCorrect={onCorrect}
            onEdit={onEdit}
            onRemove={onRemove}
          />
        ))}
      </TableBody>
    </Table>
  );
}
