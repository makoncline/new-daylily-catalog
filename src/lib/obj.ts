// Keeps nulls, drops only undefined
export function pickDefined<T extends object, K extends readonly (keyof T)[]>(
  obj: T,
  keys: K,
): { [P in K[number]]?: Exclude<T[P], undefined> } {
  const out = {} as { [P in K[number]]?: Exclude<T[P], undefined> };
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined) {
      // one localized assertion to satisfy TS indexability
      (out as Record<keyof T, unknown>)[k] = v as unknown;
    }
  }
  return out;
}
