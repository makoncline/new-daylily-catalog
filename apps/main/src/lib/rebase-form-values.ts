export function rebaseFormValues<T extends object>(
  draft: T,
  previous: T,
  updated: T,
): T | null {
  const rebased = { ...draft };
  for (const key of Object.keys(previous) as Array<keyof T>) {
    if (draft[key] === previous[key]) {
      rebased[key] = updated[key];
    } else if (updated[key] !== previous[key] && draft[key] !== updated[key]) {
      return null;
    }
  }
  return rebased;
}

export function equalFormValues<T extends object>(a: T, b: T): boolean {
  return (Object.keys(a) as Array<keyof T>).every((key) => a[key] === b[key]);
}
