import type { CultivarMatchCandidate } from "@/lib/catalog-importer";
import {
  createTempImportIssue,
  toTempListingDraft,
  matchTempListings,
  type TempListing,
  type TempImportIssue,
} from "./temp-list";

export interface TempReviewRow {
  listing: TempListing;
  match: CultivarMatchCandidate | null;
  candidates: CultivarMatchCandidate[];
  keepUnlinked?: boolean;
  draftName?: string;
  preserveName?: boolean;
}

export function tempListingKey(listing: TempListing) {
  return JSON.stringify([
    listing.cultivarReferenceId,
    listing.name.trim(),
    listing.price,
    listing.description.trim(),
    listing.privateNote.trim(),
    [...(listing.lists ?? [])].sort(),
    (listing.extraFields ?? [])
      .filter(({ value }) => value.trim())
      .sort((a, b) => a.label.localeCompare(b.label)),
  ]);
}

export function getTempDuplicateIds(
  rows: TempReviewRow[],
  listings: TempListing[],
) {
  const seen = new Set(listings.map(tempListingKey));
  const knownNames = new Set(
    listings.map((listing) => listing.name.trim().toLowerCase()),
  );
  const knownLinks = new Set(
    listings.map((listing) => listing.cultivarReferenceId).filter(Boolean),
  );
  return new Set(
    rows
      .filter(({ listing }) => {
        const key = tempListingKey(listing);
        const nameOnly =
          listing.price === null &&
          !listing.description.trim() &&
          !listing.privateNote.trim() &&
          !listing.lists?.length &&
          !listing.extraFields?.some(({ value }) => value.trim());
        if (
          seen.has(key) ||
          (nameOnly &&
            (knownNames.has(listing.name.trim().toLowerCase()) ||
              (listing.cultivarReferenceId &&
                knownLinks.has(listing.cultivarReferenceId))))
        )
          return true;
        seen.add(key);
        knownNames.add(listing.name.trim().toLowerCase());
        if (listing.cultivarReferenceId)
          knownLinks.add(listing.cultivarReferenceId);
        return false;
      })
      .map(({ listing }) => listing.id),
  );
}

export async function matchReviewListings(
  added: TempListing[],
  preserveLinks = false,
  preserveNames = false,
  signal?: AbortSignal,
) {
  const results = await matchTempListings(added, {
    signal,
    includeCandidates: true,
    preserveLinks,
  });
  const rows: TempReviewRow[] = [];
  const issues: TempImportIssue[] = [];
  added.forEach((listing, index) => {
    const result = results[index];
    if (result?.invalidCultivarReferenceId) {
      issues.push(
        createTempImportIssue(
          toTempListingDraft(listing),
          [
            {
              field: "cultivarReferenceId",
              message: "Cultivar link not found. Correct the ID or clear it.",
            },
          ],
          undefined,
          true,
        ),
      );
      return;
    }
    rows.push({
      preserveName: preserveNames || preserveLinks,
      listing: {
        ...listing,
        name:
          preserveNames || preserveLinks
            ? listing.name
            : (result?.exactMatch?.displayName ?? listing.name),
        cultivarReferenceId: result?.exactMatch?.cultivarReferenceId ?? null,
      },
      match: result?.exactMatch ?? null,
      candidates: result?.candidates ?? [],
      keepUnlinked: preserveLinks && !listing.cultivarReferenceId,
    });
  });
  return { rows, issues };
}
