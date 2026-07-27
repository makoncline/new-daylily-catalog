import { normalizeCultivarName } from "@/lib/utils/cultivar-utils";

const MATCH_TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;

export function toLooseCultivarMatchText(value: string) {
  const normalized = normalizeCultivarName(value)?.replaceAll(".", "") ?? "";
  return (normalized.match(MATCH_TOKEN_PATTERN) ?? []).join(" ");
}

function getTokens(value: string) {
  return new Set(value.split(" ").filter(Boolean));
}

function getTokenSimilarity(left: string, right: string) {
  const leftTokens = getTokens(left);
  const rightTokens = getTokens(right);
  const union = new Set([...leftTokens, ...rightTokens]);
  if (union.size === 0) {
    return 0;
  }

  let intersectionSize = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersectionSize += 1;
    }
  }

  return intersectionSize / union.size;
}

export function getDamerauLevenshteinDistance(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  if (left.length === 0) {
    return right.length;
  }

  if (right.length === 0) {
    return left.length;
  }

  let previousPrevious = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );
  let previous = [...previousPrevious];

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      let distance = Math.min(
        (current[rightIndex - 1] ?? 0) + 1,
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) + substitutionCost,
      );

      if (
        leftIndex > 1 &&
        rightIndex > 1 &&
        left[leftIndex - 1] === right[rightIndex - 2] &&
        left[leftIndex - 2] === right[rightIndex - 1]
      ) {
        distance = Math.min(
          distance,
          (previousPrevious[rightIndex - 2] ?? 0) + 1,
        );
      }

      current[rightIndex] = distance;
    }

    previousPrevious = previous;
    previous = current;
  }

  return previous[right.length] ?? Math.max(left.length, right.length);
}

export function getCultivarMatchConfidence(
  inputName: string,
  candidateName: string,
) {
  const normalizedInput = normalizeCultivarName(inputName);
  const normalizedCandidate = normalizeCultivarName(candidateName);
  if (!normalizedInput || !normalizedCandidate) {
    return 0;
  }

  if (normalizedInput === normalizedCandidate) {
    return 100;
  }

  const looseInput = toLooseCultivarMatchText(normalizedInput);
  const looseCandidate = toLooseCultivarMatchText(normalizedCandidate);
  if (!looseInput || !looseCandidate) {
    return 0;
  }

  if (looseInput === looseCandidate) {
    return 98;
  }

  const distance = getDamerauLevenshteinDistance(looseInput, looseCandidate);
  const editSimilarity =
    1 - distance / Math.max(looseInput.length, looseCandidate.length, 1);
  const tokenSimilarity = getTokenSimilarity(looseInput, looseCandidate);
  let confidence = Math.max(
    editSimilarity,
    editSimilarity * 0.82 + tokenSimilarity * 0.18,
  );

  if (
    looseInput.includes(looseCandidate) ||
    looseCandidate.includes(looseInput)
  ) {
    confidence = Math.max(confidence, 0.82);
  }

  return Math.max(0, Math.min(99, Math.round(confidence * 100)));
}
