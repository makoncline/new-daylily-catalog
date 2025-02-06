/**
 * Case-insensitive sort that prioritizes items starting with letters before numbers
 * @param items Array of objects with a title property
 * @returns Sorted array with letter-first titles before number-first titles
 */
export function sortTitlesLettersBeforeNumbers<T extends { title: string }>(
  items: T[],
): T[] {
  return items.sort((a, b) => {
    const titleA = a.title.toLowerCase();
    const titleB = b.title.toLowerCase();

    // Put letters before numbers
    const aStartsWithNumber = /^\d/.test(titleA);
    const bStartsWithNumber = /^\d/.test(titleB);
    if (aStartsWithNumber !== bStartsWithNumber) {
      return aStartsWithNumber ? 1 : -1;
    }

    return titleA.localeCompare(titleB);
  });
}
