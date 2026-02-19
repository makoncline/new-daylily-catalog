type ParsedPrimitive = string | number | boolean;

function parseJsonValue(rawValue: string): unknown {
  try {
    return JSON.parse(rawValue);
  } catch {
    return rawValue;
  }
}

function parseListsFilterValue(rawValue: string): string[] {
  if (rawValue.includes(",")) {
    return rawValue.split(",").filter((entry) => entry.length > 0);
  }

  const parsed = parseJsonValue(rawValue);
  if (Array.isArray(parsed)) {
    return parsed
      .map((entry) => (typeof entry === "string" ? entry : String(entry)))
      .filter((entry) => entry.length > 0);
  }

  if (
    typeof parsed === "string" ||
    typeof parsed === "number" ||
    typeof parsed === "boolean"
  ) {
    const value = String(parsed);
    return value.length > 0 ? [value] : [];
  }

  return rawValue.length > 0 ? [rawValue] : [];
}

export function parseTableUrlColumnFilterValue(
  columnId: string,
  rawValue: string,
): ParsedPrimitive | string[] {
  if (columnId === "lists") {
    return parseListsFilterValue(rawValue);
  }

  if (rawValue.includes(",")) {
    return rawValue.split(",").filter((entry) => entry.length > 0);
  }

  const parsed = parseJsonValue(rawValue);
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
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry : String(entry)))
      .join(",");
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return JSON.stringify(value);
}
