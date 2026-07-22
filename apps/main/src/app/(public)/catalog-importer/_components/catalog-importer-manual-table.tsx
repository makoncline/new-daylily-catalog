"use client";

import { Fragment, useRef, useState } from "react";
import { ImageOff, Plus, Search, Trash2 } from "lucide-react";
import { OptimizedImage } from "@/components/optimized-image";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import { getCultivarImage } from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";
import type { CultivarMatchCandidate } from "@/lib/catalog-importer";
import { requestCultivarMatches } from "@/lib/catalog-importer-match-client";

export function CatalogImporterManualTable({
  controller,
}: {
  controller: CatalogImporterWorkbenchController;
}) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<CultivarMatchCandidate[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchRequestId = useRef(0);
  const rows = controller.selectedSheet?.rows.slice(1) ?? [];
  const remaining = Math.max(0, 10 - rows.length);

  const searchCultivars = async () => {
    const value = query.trim();
    if (!value) return;
    const requestId = ++searchRequestId.current;
    setSearching(true);
    setHasSearched(false);
    setCandidates([]);
    setSearchError(null);
    try {
      const [result] = await requestCultivarMatches({
        includeCandidates: true,
        names: [value],
      });
      if (requestId !== searchRequestId.current) return;
      setCandidates(result?.candidates.slice(0, 5) ?? []);
      setHasSearched(true);
    } catch {
      if (requestId !== searchRequestId.current) return;
      setCandidates([]);
      setSearchError("Cultivar search did not finish. Try again.");
    } finally {
      if (requestId === searchRequestId.current) {
        setSearching(false);
      }
    }
  };

  const addCandidate = (candidate: CultivarMatchCandidate) => {
    controller.addManualCatalogRow({
      cultivarReferenceId: candidate.cultivarReferenceId,
      name: candidate.displayName,
    });
    setQuery("");
    setCandidates([]);
    setHasSearched(false);
  };

  return (
    <section aria-labelledby="manual-catalog-heading" className="space-y-5">
      <div>
        <h2
          id="manual-catalog-heading"
          className="text-xl font-semibold tracking-tight"
        >
          Add your listings
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Search registered cultivars or add an unlinked name. Up to 10
          listings.
        </p>
      </div>

      {remaining > 0 ? (
        <div className="max-w-3xl border-y py-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void searchCultivars();
            }}
          >
            <InputGroup>
              <InputGroupInput
                value={query}
                onChange={(event) => {
                  searchRequestId.current += 1;
                  setQuery(event.target.value);
                  setCandidates([]);
                  setHasSearched(false);
                  setSearching(false);
                  setSearchError(null);
                }}
                placeholder="Search cultivar name"
                aria-label="Search cultivar name"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={searching || !query.trim()}
                >
                  {searching ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Search data-icon="inline-start" />
                  )}
                  Search
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>

          {searchError ? (
            <p className="text-destructive mt-3 text-sm">{searchError}</p>
          ) : hasSearched && candidates.length === 0 ? (
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyTitle>No cultivars found</EmptyTitle>
                <EmptyDescription>Try another name.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {candidates.length > 0 ? (
            <ItemGroup className="mt-3 border-y" aria-label="Cultivar results">
              {candidates.map((candidate, index) => {
                const image = getCultivarImage(candidate);

                return (
                  <Fragment key={candidate.cultivarReferenceId}>
                    {index > 0 ? <ItemSeparator /> : null}
                    <Item role="listitem" size="sm" className="px-0">
                      <ItemMedia
                        variant={image ? "image" : "icon"}
                        className="size-12"
                      >
                        {image ? (
                          <OptimizedImage
                            image={image}
                            variant="thumb"
                            alt={`${candidate.displayName} reference photo`}
                            className="size-full"
                          />
                        ) : (
                          <ImageOff aria-hidden="true" />
                        )}
                      </ItemMedia>
                      <ItemContent className="min-w-0">
                        <ItemTitle className="truncate">
                          {candidate.displayName}
                        </ItemTitle>
                        <ItemDescription className="truncate">
                          {[candidate.hybridizer, candidate.year]
                            .filter(Boolean)
                            .join(" · ") || "Registered cultivar"}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addCandidate(candidate)}
                        >
                          <Plus data-icon="inline-start" />
                          Add
                        </Button>
                      </ItemActions>
                    </Item>
                  </Fragment>
                );
              })}
            </ItemGroup>
          ) : null}

          {query.trim() && !searching ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => {
                controller.addManualCatalogRow({ name: query.trim() });
                setQuery("");
                setCandidates([]);
                setHasSearched(false);
              }}
            >
              <Plus className="size-4" />
              Add “{query.trim()}” without a cultivar link
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="border-y py-3 text-sm font-medium">
          The 10-listing preview is full.
        </p>
      )}

      <div className="rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="w-10 border-r border-b px-2 py-2 text-left font-medium">
                #
              </th>
              <th className="border-r border-b px-3 py-2 text-left font-medium">
                Name
              </th>
              <th className="w-12 border-b px-2 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-0">
                  <Empty className="py-8">
                    <EmptyHeader>
                      <EmptyDescription>
                        Search above to add your first listing.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </td>
              </tr>
            ) : (
              rows.map((row, dataIndex) => {
                const rowIndex = dataIndex + 1;
                return (
                  <tr key={rowIndex}>
                    <th
                      scope="row"
                      className="text-muted-foreground border-r border-b px-2 py-2 font-mono font-normal"
                    >
                      {rowIndex}
                    </th>
                    <td className="border-r border-b px-3 py-2 font-medium">
                      {String(row[0] ?? "")}
                    </td>
                    <td className="border-b p-1 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`Remove ${String(row[0] ?? `row ${rowIndex}`)}`}
                        onClick={() =>
                          controller.removeManualCatalogRow(rowIndex)
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground text-xs tabular-nums">
        {rows.length}/10 listings
      </p>
    </section>
  );
}
