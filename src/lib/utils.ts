import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { type AhsListing } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a price to a currency string
 * @param price - The price to format
 * @returns The formatted price string
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

export function formatRelativeDate(date: Date, prefix = "Updated"): string {
  const now = new Date();
  const days = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)),
  );

  if (days < 1) {
    return `${prefix} today`;
  }

  if (days < 30) {
    return `${prefix} ${days} day${days === 1 ? "" : "s"} ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${prefix} ${months} month${months === 1 ? "" : "s"} ago`;
  }

  const years = Math.floor(months / 12);
  return `${prefix} ${years} year${years === 1 ? "" : "s"} ago`;
}

// Types for the result object with discriminated union
type Success<T> = {
  data: T;
  error: null;
};

type Failure<E> = {
  data: null;
  error: E;
};

type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Safely extracts an error code from any error object
 * @param error Any error object
 * @returns The error code as a string, or undefined if no code exists
 */
export function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && code.length > 0) {
    return code;
  }

  if (typeof code === "number" || typeof code === "bigint") {
    return String(code);
  }

  return undefined;
}

// Main wrapper function
export async function tryCatch<T, E = Error>(
  promise: Promise<T>,
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as E };
  }
}

export async function uploadFileWithProgress({
  presignedUrl,
  file,
  onProgress,
}: {
  presignedUrl: string;
  file: Blob;
  onProgress: (pct: number) => void;
}) {
  if (presignedUrl.startsWith("mock-upload://")) {
    onProgress(100);
    return;
  }

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("Upload failed"));
    });
    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.open("PUT", presignedUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

export function formatAhsListingSummary(
  ahs: Partial<AhsListing> | null,
): string | null {
  return formatAhsSummary(ahs, true);
}

export function formatAhsListingSummaryForCard(
  ahs: Partial<AhsListing> | null,
): string | null {
  return formatAhsSummary(ahs, false);
}

function formatAhsSummary(
  ahs: Partial<AhsListing> | null,
  includeIdentity: boolean,
): string | null {
  if (!ahs) return null;

  const parts: string[] = [];

  if (includeIdentity) {
    const identity = getAhsIdentityLine(ahs);
    if (identity) {
      parts.push(identity);
    }
  }

  pushJoined(parts, [
    ahs.scapeHeight ? `height ${ahs.scapeHeight}` : null,
    ahs.bloomSize ? `bloom ${ahs.bloomSize}` : null,
  ]);

  pushJoined(parts, [
    ahs.bloomSeason ? `season ${ahs.bloomSeason}` : null,
    ahs.bloomHabit,
  ]);

  pushJoined(parts, [ahs.foliageType, ahs.ploidy]);

  pushJoined(parts, [
    ahs.budcount ? `${ahs.budcount} buds` : null,
    ahs.branches ? `${ahs.branches} branches` : null,
  ]);

  pushJoined(parts, [ahs.color, ahs.form]);

  if (ahs.parentage) {
    parts.push(`(${ahs.parentage})`);
  }

  const summary = parts.filter(Boolean).join(", ");
  return summary || null;
}

function getAhsIdentityLine(ahs: Partial<AhsListing>) {
  if (!ahs.name && !ahs.hybridizer && !ahs.year) {
    return null;
  }

  const details = [ahs.hybridizer, ahs.year].filter(Boolean).join(", ");

  if (ahs.name && details) {
    return `${ahs.name} (${details})`;
  }

  if (ahs.name) {
    return ahs.name;
  }

  return details ? `(${details})` : null;
}

function pushJoined(target: string[], values: Array<string | null | undefined>) {
  const joined = values.filter(Boolean).join(", ");
  if (joined) {
    target.push(joined);
  }
}
