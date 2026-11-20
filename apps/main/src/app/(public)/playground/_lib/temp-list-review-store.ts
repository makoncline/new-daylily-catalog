"use client";

import type { CatalogInputDraft } from "@/lib/catalog-input";
import { tempListingSchema, type TempImportIssue } from "./temp-list";
import type { TempReviewRow } from "./temp-list-review";

export interface TempReviewDraft extends CatalogInputDraft {
  review: TempReviewRow[];
  issues: TempImportIssue[];
}

const KEY = "daylily-catalog:temp-review";
const empty: TempReviewDraft = {
  review: [],
  issues: [],
  input: "single",
  names: "",
  sheet: null,
};
interface TempReviewSnapshot {
  draft: TempReviewDraft;
  ready: boolean;
  error: string | null;
}
const serverSnapshot: TempReviewSnapshot = {
  draft: empty,
  ready: false,
  error: null,
};
let snapshot = serverSnapshot;
let initialized = false;
let unsaved = false;
const listeners = new Set<() => void>();

export function getTempReviewServerSnapshot() {
  return serverSnapshot;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCandidate(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.cultivarReferenceId === "string" &&
    typeof value.displayName === "string" &&
    typeof value.confidence === "number" &&
    (value.imageUrl === null || typeof value.imageUrl === "string") &&
    (value.hybridizer === null || typeof value.hybridizer === "string") &&
    (value.year === null || typeof value.year === "number")
  );
}

function isReviewDraft(value: unknown): value is TempReviewDraft {
  if (!isRecord(value)) return false;
  if (
    !["single", "paste", "spreadsheet"].includes(String(value.input)) ||
    typeof value.names !== "string" ||
    !Array.isArray(value.review) ||
    !Array.isArray(value.issues)
  )
    return false;
  if (
    !value.review.every(
      (row: unknown) =>
        isRecord(row) &&
        tempListingSchema.safeParse(row.listing).success &&
        (row.match === null || isCandidate(row.match)) &&
        Array.isArray(row.candidates) &&
        row.candidates.every(isCandidate) &&
        (row.draftName === undefined || typeof row.draftName === "string") &&
        (row.keepUnlinked === undefined ||
          typeof row.keepUnlinked === "boolean"),
    )
  )
    return false;
  if (
    !value.issues.every((issue: unknown) => {
      if (!isRecord(issue) || !isRecord(issue.draft)) return false;
      const draft = issue.draft;
      return (
        typeof issue.id === "string" &&
        typeof issue.name === "string" &&
        typeof issue.preserveLinks === "boolean" &&
        ["id", "name", "price", "description", "privateNote"].every(
          (field) => typeof draft[field] === "string",
        ) &&
        Array.isArray(issue.errors) &&
        issue.errors.every(
          (error: unknown) =>
            isRecord(error) &&
            typeof error.message === "string" &&
            [
              "name",
              "lists",
              "price",
              "description",
              "privateNote",
              "cultivarReferenceId",
            ].includes(String(error.field)),
        )
      );
    })
  )
    return false;
  if (value.sheet === null) return true;
  if (
    !isRecord(value.sheet) ||
    !isRecord(value.sheet.workbook) ||
    !isRecord(value.sheet.mapping)
  )
    return false;
  const { workbook, index, header, mapping } = value.sheet;
  return (
    typeof workbook.fileName === "string" &&
    Array.isArray(workbook.sheets) &&
    Number.isInteger(index) &&
    Number(index) >= 0 &&
    Number(index) < workbook.sheets.length &&
    (header === null || (Number.isInteger(header) && Number(header) >= 0)) &&
    [
      "title",
      "price",
      "description",
      "privateNote",
      "cultivarReferenceId",
      "lists",
    ].every(
      (field) =>
        mapping[field] === null ||
        (Number.isInteger(mapping[field]) && Number(mapping[field]) >= 0),
    ) &&
    workbook.sheets.every(
      (sheet: unknown) =>
        isRecord(sheet) &&
        typeof sheet.name === "string" &&
        Array.isArray(sheet.rows) &&
        sheet.rows.every(Array.isArray),
    )
  );
}

export function getTempReviewSnapshot() {
  if (!initialized) {
    initialized = true;
    try {
      const raw = localStorage.getItem(KEY);
      const draft: unknown = raw ? JSON.parse(raw) : empty;
      if (!isReviewDraft(draft)) throw new Error("Invalid review draft");
      snapshot = { draft, ready: true, error: null };
    } catch {
      snapshot = {
        draft: empty,
        ready: true,
        error: "The unfinished batch could not be read. Upload the file again.",
      };
    }
  }
  return snapshot;
}

function persistTempReview(draft: TempReviewDraft) {
  try {
    if (
      draft.review.length ||
      draft.issues.length ||
      draft.sheet ||
      draft.names
    )
      localStorage.setItem(KEY, JSON.stringify(draft));
    else localStorage.removeItem(KEY);
    return null;
  } catch {
    return "This browser could not save the unfinished batch. Keep this page open.";
  }
}

function writeTempReview(draft: TempReviewDraft) {
  const error = persistTempReview(draft);
  unsaved = error !== null;
  snapshot = { draft, ready: true, error };
  listeners.forEach((listener) => listener());
}

export function updateTempReview(
  update: (draft: TempReviewDraft) => TempReviewDraft,
) {
  writeTempReview(update(getTempReviewSnapshot().draft));
}

export function commitTempReview(
  remaining: TempReviewDraft | null,
  saveCatalog: () => boolean,
) {
  const original = getTempReviewSnapshot().draft;
  persistTempReview(empty);
  let saved = false;
  try {
    saved = saveCatalog();
    return saved;
  } finally {
    writeTempReview(saved ? (remaining ?? empty) : original);
  }
}

function handleStorage(event: StorageEvent) {
  if (unsaved || (event.key !== KEY && event.key !== null)) return;
  initialized = false;
  listeners.forEach((listener) => listener());
}

export function subscribeToTempReview(listener: () => void) {
  if (!listeners.size) window.addEventListener("storage", handleStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("storage", handleStorage);
  };
}
