import deburr from "lodash.deburr";

const CHAR_VARIANT_MAP: Record<string, string> = {
  "\u2019": "'",
  "\u2018": "'",
  "\u02BC": "'",
  "\uFF07": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u2033": '"',
  "\uFF02": '"',
  "\u2013": "-",
  "\u2014": "-",
  "\u2212": "-",
  "\uFE63": "-",
  "\uFF0D": "-",
  "\u00AD": "",
  "\u00A0": " ",
  "\u2007": " ",
  "\u202F": " ",
};
const CHAR_VARIANT_REGEX =
  /[\u2019\u2018\u02BC\uFF07\u201C\u201D\u2033\uFF02\u2013\u2014\u2212\uFE63\uFF0D\u00AD\u00A0\u2007\u202F]/g;
const APOSTROPHE_REGEX = /['\u02BC]/g;
const WHITESPACE_REGEX = /\s+/g;

function toSearchableText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  if (typeof value === "symbol") {
    return value.description ?? "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return "";
}

export function normalizeSearchText(value: unknown): string {
  if (value == null) {
    return "";
  }

  let normalized = toSearchableText(value).normalize("NFKC");
  normalized = normalized.replace(
    CHAR_VARIANT_REGEX,
    (character) => CHAR_VARIANT_MAP[character] ?? character,
  );

  return deburr(normalized)
    .toLowerCase()
    .replace(APOSTROPHE_REGEX, "")
    .replace(WHITESPACE_REGEX, " ")
    .trim();
}
