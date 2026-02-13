export type WithoutUndefined<T> = { [K in keyof T]: Exclude<T[K], undefined> };
export type DefinedPatch<T> = Partial<WithoutUndefined<T>>;

/**
 * Remove only keys whose value is `undefined`. Keeps `null` intact.
 * Useful for PATCH-like updates where `undefined` means "do not change".
 */
export function omitUndefined<T extends object>(
  obj: T | null | undefined,
): DefinedPatch<T> {
  if (!obj) return {} as DefinedPatch<T>;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as DefinedPatch<T>;
}

