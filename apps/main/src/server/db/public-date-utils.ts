export function toDate(value: Date | string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function getLatestDate(
  dates: Array<Date | string | null | undefined>,
  fallback: Date | string,
) {
  const timestamps = dates
    .map((value) => toDate(value))
    .filter((value): value is Date => Boolean(value))
    .map((value) => value.getTime());

  const fallbackDate = toDate(fallback) ?? new Date(0);

  if (timestamps.length === 0) {
    return fallbackDate;
  }

  return new Date(Math.max(...timestamps));
}
