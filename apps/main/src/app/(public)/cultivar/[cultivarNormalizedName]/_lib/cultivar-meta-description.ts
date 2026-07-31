import { formatAhsListingSummary } from "@/lib/utils";

interface CultivarMetaDescriptionInput {
  ahsListing: Parameters<typeof formatAhsListingSummary>[0];
  gardensCount: number;
  hybridizer: string | null;
  name: string;
  offersCount: number;
  year: string | null;
}

export function buildCultivarMetaDescription({
  ahsListing,
  gardensCount,
  hybridizer,
  name,
  offersCount,
  year,
}: CultivarMetaDescriptionInput) {
  const identity = hybridizer
    ? `${name} (${hybridizer}${year ? `, ${year}` : ""})`
    : `${name} daylily`;
  const generatedSummary = formatAhsListingSummary(ahsListing);

  if (generatedSummary) {
    const availabilitySentence =
      offersCount > 0
        ? `See photos and ${offersCount.toLocaleString()} public ${offersCount === 1 ? "offer" : "offers"} from ${gardensCount.toLocaleString()} grower ${gardensCount === 1 ? "catalog" : "catalogs"}.`
        : "View photos and cultivar details. No current public grower offers are listed.";
    const normalizedSummary = generatedSummary
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[.;:]+$/, "");
    const summaryLimit = 155 - availabilitySentence.length - 1;
    let fittedSummary = normalizedSummary;

    if (fittedSummary.length + 1 > summaryLimit) {
      const candidate = fittedSummary.slice(0, summaryLimit - 3);
      const lastSpace = candidate.lastIndexOf(" ");
      fittedSummary = `${(lastSpace > 0
        ? candidate.slice(0, lastSpace)
        : candidate
      )
        .trim()
        .replace(/[,;:]$/, "")}...`;
    } else {
      fittedSummary += ".";
    }

    const generatedDescription = `${fittedSummary} ${availabilitySentence}`;
    if (generatedDescription.length >= 110) {
      return generatedDescription;
    }
  }

  const description =
    offersCount > 0
      ? `Explore ${identity}. View cultivar specifications, photos, related daylilies, and ${offersCount.toLocaleString()} public ${offersCount === 1 ? "offer" : "offers"} from ${gardensCount.toLocaleString()} grower ${gardensCount === 1 ? "catalog" : "catalogs"}.`
      : `Explore ${identity}. View cultivar specifications, photos, and related daylilies. No current public grower offers are listed.`;

  if (description.length <= 155) {
    return description;
  }

  const candidate = description.slice(0, 152);
  const lastSpace = candidate.lastIndexOf(" ");
  const truncated = lastSpace > 110 ? candidate.slice(0, lastSpace) : candidate;

  return `${truncated.trim()}...`;
}
