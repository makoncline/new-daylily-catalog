type ParsedPrimitive = string | number | boolean;

function parseJsonValue(rawValue: string): unknown {
  try {
    return JSON.parse(rawValue);
  } catch {
    return rawValue;
  }
}

function parseListsFilterValue(rawValue: string): string[] {
  const parsed = parseJsonValue(rawValue);
  if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  if (rawValue.includes(",") && !rawValue.startsWith('"')) {
    return rawValue.split(",").filter(Boolean);
  }
  return typeof parsed === "string" ||
    typeof parsed === "number" ||
    typeof parsed === "boolean"
    ? [String(parsed)].filter(Boolean)
    : rawValue.length > 0
      ? [rawValue]
      : [];
}

export function parseTableUrlColumnFilterValue(
  columnId: string,
  rawValue: string,
): ParsedPrimitive | string[] {
  if (columnId === "lists") {
    return parseListsFilterValue(rawValue);
  }

  const parsed = parseJsonValue(rawValue);
  if (Array.isArray(parsed)) return parsed.map(String);
  if (typeof parsed === "string" && rawValue.startsWith('"')) return parsed;
  if (rawValue.includes(",")) {
    return rawValue.split(",").filter((entry) => entry.length > 0);
  }

  if (
    typeof parsed === "string" ||
    typeof parsed === "number" ||
    typeof parsed === "boolean"
  ) {
    return parsed;
  }

  return rawValue;
}

export function toTableUrlColumnFilterParamValue(value: unknown): string {
  return JSON.stringify(value);
}
