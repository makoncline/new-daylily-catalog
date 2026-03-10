"use client";

import { normalizeSearchText } from "@/lib/search-normalization";

export interface NumericRange {
  min: number | null;
  max: number | null;
}

const NUMERIC_TOKEN_REGEX = /-?\d+(?:\.\d+)?/;

function toNumberOrNull(value: string) {
  if (value.trim().length === 0) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseNumericRange(rawValue: unknown): NumericRange | null {
  if (typeof rawValue !== "string") {
    return null;
  }

  if (!rawValue.includes(":")) {
    return null;
  }

  const [rawMin = "", rawMax = ""] = rawValue.split(":");
  const min = toNumberOrNull(rawMin);
  const max = toNumberOrNull(rawMax);

  if (min === null && max === null) {
    return null;
  }

  return {
    min,
    max,
  };
}

export function formatNumericRange(range: NumericRange) {
  const min = range.min === null ? "" : String(range.min);
  const max = range.max === null ? "" : String(range.max);

  return `${min}:${max}`;
}

export function extractNumericValue(rawValue: unknown): number | null {
  if (typeof rawValue === "number") {
    return Number.isFinite(rawValue) ? rawValue : null;
  }

  if (typeof rawValue !== "string") {
    return null;
  }

  const match = NUMERIC_TOKEN_REGEX.exec(rawValue.replace(/,/g, ""));
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function matchesNumericRange(value: unknown, rawRange: unknown) {
  const range = parseNumericRange(rawRange);

  if (!range) {
    return true;
  }

  const numberValue = extractNumericValue(value);
  if (numberValue === null) {
    return false;
  }

  if (range.min !== null && numberValue < range.min) {
    return false;
  }

  if (range.max !== null && numberValue > range.max) {
    return false;
  }

  return true;
}

export function matchesTextContains(value: unknown, rawFilter: unknown) {
  if (typeof rawFilter !== "string") {
    return true;
  }

  const normalizedFilter = normalizeSearchText(rawFilter);
  if (normalizedFilter.length === 0) {
    return true;
  }

  const normalizedValue = normalizeSearchText(value);
  return normalizedValue.includes(normalizedFilter);
}

export function matchesExactValue(value: unknown, rawFilter: unknown) {
  if (
    rawFilter === undefined ||
    rawFilter === null ||
    (typeof rawFilter === "string" && rawFilter.length === 0)
  ) {
    return true;
  }

  const normalizedValue = normalizeSearchText(value);
  if (normalizedValue.length === 0) {
    return false;
  }

  if (Array.isArray(rawFilter)) {
    const allowedValues = rawFilter
      .map((entry) => normalizeSearchText(entry))
      .filter((entry) => entry.length > 0);

    if (allowedValues.length === 0) {
      return true;
    }

    return allowedValues.includes(normalizedValue);
  }

  return normalizeSearchText(rawFilter) === normalizedValue;
}
