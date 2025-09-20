// src/app/dashboard-two/listings/_components/status.ts
import type { DbListing } from "./types";
import type { UiStatus } from "./types";

export const fromDbStatus = (s: DbListing["status"]): UiStatus =>
  s === "HIDDEN" ? "hidden" : "published";

export const toDbStatus = (u: UiStatus): DbListing["status"] =>
  u === "hidden" ? "HIDDEN" : null;
