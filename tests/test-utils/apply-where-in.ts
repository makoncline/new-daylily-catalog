export function applyWhereIn<T extends Record<string, unknown>>(
  rows: T[],
  args: unknown,
  field: keyof T & string,
) {
  const allowed = (args as {
    where?: Partial<Record<keyof T & string, { in?: unknown[] }>>;
  })?.where?.[field]?.in;

  if (!Array.isArray(allowed)) {
    return rows;
  }

  return rows.filter((row) => allowed.includes(row[field]));
}
