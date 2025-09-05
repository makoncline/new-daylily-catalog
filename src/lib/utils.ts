import { type ClassValue, clsx } from "clsx";
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
  if (error && typeof error === "object" && "code" in error && error.code) {
    return JSON.stringify(error.code);
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
  if (!ahs) return null;

  const parts = [];

  // Name, hybridizer and year
  if (ahs.name || ahs.hybridizer || ahs.year) {
    const name = ahs.name ?? "";
    const hybridizer = ahs.hybridizer ? `(${ahs.hybridizer}` : "";
    const year = ahs.year ? `, ${ahs.year})` : hybridizer ? ")" : "";
    parts.push([name, hybridizer + year].filter(Boolean).join(" "));
  }

  // Height and bloom size
  if (ahs.scapeHeight || ahs.bloomSize) {
    const height = ahs.scapeHeight ? `height ${ahs.scapeHeight}` : "";
    const bloom = ahs.bloomSize ? `bloom ${ahs.bloomSize}` : "";
    parts.push([height, bloom].filter(Boolean).join(", "));
  }

  // Season and bloom habit
  if (ahs.bloomSeason || ahs.bloomHabit) {
    const season = ahs.bloomSeason ? `season ${ahs.bloomSeason}` : "";
    const habit = ahs.bloomHabit ?? "";
    parts.push([season, habit].filter(Boolean).join(", "));
  }

  // Foliage and ploidy
  if (ahs.foliageType || ahs.ploidy) {
    const foliage = ahs.foliageType ?? "";
    const ploidy = ahs.ploidy ?? "";
    parts.push([foliage, ploidy].filter(Boolean).join(", "));
  }

  // Buds and branches
  if (ahs.budcount || ahs.branches) {
    const buds = ahs.budcount ? `${ahs.budcount} buds` : "";
    const branches = ahs.branches ? `${ahs.branches} branches` : "";
    parts.push([buds, branches].filter(Boolean).join(", "));
  }

  // Color and form
  if (ahs.color || ahs.form) {
    const color = ahs.color ?? "";
    const form = ahs.form ? `${ahs.form}` : "";
    parts.push([color, form].filter(Boolean).join(", "));
  }

  // Parentage
  if (ahs.parentage) {
    parts.push(`(${ahs.parentage})`);
  }

  const summary = parts.filter(Boolean).join(", ");
  return summary || null;
}
