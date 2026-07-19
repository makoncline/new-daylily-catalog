"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import type {
  CatalogImportRow,
  CultivarMatchCandidate,
} from "@/lib/catalog-importer";
import { requestCultivarMatches } from "@/lib/catalog-importer-match-client";
import {
  CatalogImporterCandidateList,
  CatalogImporterSourceRow,
} from "@/app/(public)/catalog-importer/_components/catalog-importer-match-options";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import {
  getErrorMessage,
  type CatalogImporterCandidateResult,
} from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";

interface CatalogImporterMatchSheetProps {
  controller: CatalogImporterWorkbenchController;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  row: CatalogImportRow | null;
}

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function uniqueCandidates(
  candidates: Array<CultivarMatchCandidate | null | undefined>,
) {
  return [
    ...new Map(
      candidates
        .filter((candidate): candidate is CultivarMatchCandidate =>
          Boolean(candidate),
        )
        .map((candidate) => [candidate.cultivarReferenceId, candidate]),
    ).values(),
  ];
}

export function CatalogImporterMatchSheet({
  controller,
  onOpenChange,
  open,
  row,
}: CatalogImporterMatchSheetProps) {
  const [closeResult, setCloseResult] =
    useState<CatalogImporterCandidateResult | null>(null);
  const [searchResult, setSearchResult] =
    useState<CatalogImporterCandidateResult | null>(null);
  const [query, setQuery] = useState(row?.sourceTitle ?? "");
  const closeRequestId = useRef(0);
  const searchRequestId = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadCloseMatches = useCallback(async (activeRow: CatalogImportRow) => {
    const requestId = closeRequestId.current + 1;
    closeRequestId.current = requestId;
    setCloseResult({
      candidates: uniqueCandidates([activeRow.match, activeRow.suggestedMatch]),
      error: null,
      loading: true,
      query: activeRow.title,
      rowId: activeRow.id,
    });

    try {
      const [result] = await requestCultivarMatches({
        includeCandidates: true,
        names: [activeRow.title],
      });
      if (closeRequestId.current !== requestId) {
        return;
      }

      setCloseResult({
        candidates: uniqueCandidates([
          activeRow.match,
          activeRow.suggestedMatch,
          ...(result?.candidates ?? []),
        ]),
        error: null,
        loading: false,
        query: activeRow.title,
        rowId: activeRow.id,
      });
    } catch (error) {
      if (closeRequestId.current !== requestId) {
        return;
      }

      setCloseResult({
        candidates: uniqueCandidates([
          activeRow.match,
          activeRow.suggestedMatch,
        ]),
        error: getErrorMessage(error),
        loading: false,
        query: activeRow.title,
        rowId: activeRow.id,
      });
    }
  }, []);

  const searchOtherMatches = useCallback(
    async (activeRow: CatalogImportRow, searchQuery: string) => {
      const trimmedQuery = searchQuery.trim();
      if (!trimmedQuery) {
        return;
      }

      const requestId = searchRequestId.current + 1;
      searchRequestId.current = requestId;
      setSearchResult({
        candidates: [],
        error: null,
        loading: true,
        query: trimmedQuery,
        rowId: activeRow.id,
      });

      try {
        const [result] = await requestCultivarMatches({
          includeCandidates: true,
          names: [trimmedQuery],
        });
        if (searchRequestId.current !== requestId) {
          return;
        }

        setSearchResult({
          candidates: result?.candidates ?? [],
          error: null,
          loading: false,
          query: trimmedQuery,
          rowId: activeRow.id,
        });
      } catch (error) {
        if (searchRequestId.current !== requestId) {
          return;
        }

        setSearchResult({
          candidates: [],
          error: getErrorMessage(error),
          loading: false,
          query: trimmedQuery,
          rowId: activeRow.id,
        });
      }
    },
    [],
  );

  const closeCandidates = useMemo(
    () =>
      closeResult?.rowId === row?.id
        ? (closeResult?.candidates ?? []).slice(0, 5)
        : [],
    [closeResult, row?.id],
  );
  const otherCandidates = useMemo(
    () =>
      searchResult?.rowId === row?.id
        ? (searchResult?.candidates ?? []).slice(
            0,
            Math.max(0, 9 - closeCandidates.length),
          )
        : [],
    [closeCandidates.length, row?.id, searchResult],
  );
  const keyboardCandidates = useMemo(
    () => [...closeCandidates, ...otherCandidates],
    [closeCandidates, otherCandidates],
  );

  const chooseCandidate = useCallback(
    (candidate: CultivarMatchCandidate) => {
      if (!row) {
        return;
      }

      controller.selectRowMatch(row.id, candidate);
      onOpenChange(false);
    },
    [controller, onOpenChange, row],
  );

  const resetSearch = useCallback(() => {
    if (!row) {
      return;
    }

    searchRequestId.current += 1;
    setQuery(row.sourceTitle);
    setSearchResult(null);
  }, [row]);

  if (!row) {
    return null;
  }

  const closeLoading = closeResult?.rowId === row.id && closeResult.loading;
  const searchLoading = searchResult?.rowId === row.id && searchResult.loading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full max-w-none overflow-y-auto p-0 sm:max-w-3xl"
        onKeyDown={(event) => {
          if (
            event.repeat ||
            isTypingTarget(event.target) ||
            !/^[1-9]$/.test(event.key)
          ) {
            return;
          }

          const candidate = keyboardCandidates[Number(event.key) - 1];
          if (candidate) {
            event.preventDefault();
            chooseCandidate(candidate);
          }
        }}
        onOpenAutoFocus={() => {
          void loadCloseMatches(row);
        }}
      >
        <SheetHeader className="border-b p-4 pr-12 text-left sm:p-6 sm:pr-12">
          <SheetTitle>Change cultivar match</SheetTitle>
          <SheetDescription>
            Choose a match for {row.sourceTitle}.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 p-4 sm:p-6">
          <CatalogImporterSourceRow
            row={row}
            sourceCells={controller.getSourceCellsForRow(row)}
          />

          <div className="flex flex-col gap-3 border-y py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              Leave unmatched keeps this row in the prepared workbook without a
              Daylily Catalog cultivar ID or link.
            </p>
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={() => {
                controller.leaveRowUnmatched(row.id);
                onOpenChange(false);
              }}
            >
              Leave unmatched
            </Button>
          </div>

          <section className="space-y-3" aria-labelledby="sheet-close-matches">
            <div>
              <h3 id="sheet-close-matches" className="font-semibold">
                Close matches
              </h3>
              <p className="text-muted-foreground text-sm">
                Best matches for {row.title}.
              </p>
            </div>

            {closeResult?.error && closeResult.rowId === row.id ? (
              <Alert variant="destructive">
                <AlertTitle>Close match search failed</AlertTitle>
                <AlertDescription>{closeResult.error}</AlertDescription>
              </Alert>
            ) : null}

            {closeLoading && closeCandidates.length === 0 ? (
              <div className="text-muted-foreground flex min-h-32 items-center justify-center gap-2 text-sm">
                <Spinner />
                Finding close names…
              </div>
            ) : closeCandidates.length > 0 ? (
              <CatalogImporterCandidateList
                ariaLabel="Sheet close match results"
                candidates={closeCandidates}
                onChoose={chooseCandidate}
              />
            ) : !closeLoading ? (
              <div className="rounded-md border border-dashed p-6 text-center">
                <p className="font-medium">No close names found</p>
              </div>
            ) : null}
          </section>

          <section
            className="space-y-3 border-t pt-5"
            aria-labelledby="sheet-other-match"
          >
            <div>
              <h3 id="sheet-other-match" className="font-semibold">
                Other match
              </h3>
              <p className="text-muted-foreground text-sm">
                Search another cultivar spelling.
              </p>
            </div>

            <form
              className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                searchInputRef.current?.blur();
                void searchOtherMatches(row, query);
              }}
            >
              <Input
                ref={searchInputRef}
                aria-label="Search another cultivar match"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
              <Button type="button" variant="outline" onClick={resetSearch}>
                <RotateCcw className="size-4" />
                Reset
              </Button>
              <Button
                type="submit"
                disabled={searchLoading || query.trim().length === 0}
              >
                {searchLoading ? <Spinner /> : <Search className="size-4" />}
                Search
              </Button>
            </form>

            {searchResult?.error && searchResult.rowId === row.id ? (
              <Alert variant="destructive">
                <AlertTitle>Candidate search failed</AlertTitle>
                <AlertDescription>{searchResult.error}</AlertDescription>
              </Alert>
            ) : searchLoading ? (
              <div className="text-muted-foreground flex min-h-32 items-center justify-center gap-2 text-sm">
                <Spinner />
                Searching other names…
              </div>
            ) : searchResult?.rowId === row.id &&
              otherCandidates.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center">
                <p className="font-medium">No other matches found</p>
              </div>
            ) : otherCandidates.length > 0 ? (
              <CatalogImporterCandidateList
                ariaLabel="Sheet other match results"
                candidates={otherCandidates}
                startIndex={closeCandidates.length}
                onChoose={chooseCandidate}
              />
            ) : null}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
