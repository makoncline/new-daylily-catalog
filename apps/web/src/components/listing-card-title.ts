const TITLE_MAX_LENGTH = 96;
const MIN_MIDDLE_TRUNCATE_LENGTH = 5;

export function formatListingCardTitle(title: string): string {
  return truncateMiddle(title, TITLE_MAX_LENGTH);
}

function truncateMiddle(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  if (maxLength <= MIN_MIDDLE_TRUNCATE_LENGTH) {
    return `${value.slice(0, Math.max(0, maxLength - 1))}\u2026`;
  }

  const availableCharacters = maxLength - 1;
  const leadingCharacters = Math.ceil(availableCharacters * 0.6);
  const trailingCharacters = availableCharacters - leadingCharacters;

  const start = value.slice(0, leadingCharacters);
  const end = value.slice(value.length - trailingCharacters);

  return `${start}\u2026${end}`;
}

export function getListingCardTitleSizeClass(titleLength: number): string {
  if (titleLength <= 34) {
    return "text-xl leading-tight";
  }

  if (titleLength <= 52) {
    return "text-lg leading-tight";
  }

  if (titleLength <= 72) {
    return "text-base leading-snug";
  }

  return "text-sm leading-snug";
}
