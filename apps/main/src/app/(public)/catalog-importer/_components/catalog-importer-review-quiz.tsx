"use client";

import { type KeyboardEvent, useCallback, useMemo, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  SkipForward,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { CultivarMatchCandidate } from "@/lib/catalog-importer";
import {
  CatalogImporterCandidateList,
  CatalogImporterSourceRow,
} from "@/app/(public)/catalog-importer/_components/catalog-importer-match-options";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";

interface CatalogImporterReviewQuizProps {
  controller: CatalogImporterWorkbenchController;
}

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement &&
      (target.isContentEditable ||
        Boolean(target.closest('[role="dialog"], [role="menu"]'))))
  );
}

export function CatalogImporterReviewQuiz({
  controller,
}: CatalogImporterReviewQuizProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeRow = controller.activeReviewRow;
  const closeCandidateResult = controller.candidateResult;
  const finishReviewRow = controller.finishReviewRow;
  const moveReviewRow = controller.moveReviewRow;
  const resetCandidateSearch = controller.resetCandidateSearch;
  const reviewQuery = controller.reviewQuery;
  const searchCandidateResult = controller.searchCandidateResult;
  const searchCandidates = controller.searchCandidates;
  const setReviewQuery = controller.setReviewQuery;
  const skipReviewRow = controller.skipReviewRow;
  const closeCandidates = useMemo(
    () =>
      closeCandidateResult && closeCandidateResult.rowId === activeRow?.id
        ? closeCandidateResult.candidates.slice(0, 5)
        : [],
    [activeRow?.id, closeCandidateResult],
  );
  const otherCandidates = useMemo(
    () =>
      searchCandidateResult && searchCandidateResult.rowId === activeRow?.id
        ? searchCandidateResult.candidates.slice(
            0,
            Math.max(0, 9 - closeCandidates.length),
          )
        : [],
    [activeRow?.id, closeCandidates.length, searchCandidateResult],
  );
  const keyboardCandidates = useMemo(
    () => [...closeCandidates, ...otherCandidates],
    [closeCandidates, otherCandidates],
  );
  const closeLoading = Boolean(
    closeCandidateResult &&
      closeCandidateResult.rowId === activeRow?.id &&
      closeCandidateResult.loading,
  );
  const searchLoading = Boolean(
    searchCandidateResult &&
      searchCandidateResult.rowId === activeRow?.id &&
      searchCandidateResult.loading,
  );

  const chooseCandidate = useCallback(
    (candidate: CultivarMatchCandidate) => {
      if (!activeRow) {
        return;
      }

      finishReviewRow(activeRow.id, {
        linkProvenance: "user-confirmed",
        linkState: "linked",
        match: candidate,
      });
    },
    [activeRow, finishReviewRow],
  );

  const resetSearch = useCallback(() => {
    if (!activeRow) {
      return;
    }

    resetCandidateSearch(activeRow);
  }, [activeRow, resetCandidateSearch]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.repeat || isTypingTarget(event.target)) {
      return;
    }

    if (/^[1-9]$/.test(event.key)) {
      const candidate = keyboardCandidates[Number(event.key) - 1];
      if (candidate) {
        event.preventDefault();
        chooseCandidate(candidate);
      }
      return;
    }

    if (event.key.toLowerCase() === "x") {
      event.preventDefault();
      skipReviewRow();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveReviewRow(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveReviewRow(1);
    }
  };

  if (!activeRow) {
    return null;
  }

  const activePosition = controller.activeReviewIndex + 1;
  return (
    <section
      id="catalog-importer-review-quiz"
      role="region"
      aria-labelledby="catalog-importer-review-heading"
      aria-keyshortcuts="1 2 3 4 5 6 7 8 9 X ArrowLeft ArrowRight"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="focus-visible:ring-ring !scroll-mt-16 border-t pt-10 outline-none focus-visible:ring-2"
    >
      <div className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h2
            id="catalog-importer-review-heading"
            className="text-xl font-semibold tracking-tight"
          >
            Review potential matches
          </h2>
          <p className="text-muted-foreground text-sm tabular-nums">
            {controller.reviewRows.length.toLocaleString()} manual{" "}
            {controller.reviewRows.length === 1 ? "match" : "matches"} remaining
            {activePosition > 0
              ? ` · ${activePosition.toLocaleString()} of ${controller.reviewRows.length.toLocaleString()}`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground hidden text-xs lg:inline">
            <kbd className="font-mono">1–9</kbd> choose ·{" "}
            <kbd className="font-mono">X</kbd> skip ·{" "}
            <kbd className="font-mono">← →</kbd> move
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous unmatched name"
            disabled={controller.reviewRows.length < 2}
            onClick={() => controller.moveReviewRow(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next unmatched name"
            disabled={controller.reviewRows.length < 2}
            onClick={() => controller.moveReviewRow(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        <CatalogImporterSourceRow
          row={activeRow}
          sourceCells={controller.activeReviewSourceCells}
        />

        <section
          aria-labelledby="catalog-importer-close-matches-heading"
          className="space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3
                id="catalog-importer-close-matches-heading"
                className="font-semibold"
              >
                Close matches
              </h3>
              <p className="text-muted-foreground text-sm">
                Best matches for {activeRow.title}.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              aria-keyshortcuts="X"
              onClick={skipReviewRow}
            >
              <SkipForward className="size-4" />
              Skip
              <kbd
                aria-hidden="true"
                className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs"
              >
                X
              </kbd>
            </Button>
          </div>

          {closeCandidateResult?.error &&
          closeCandidateResult.rowId === activeRow.id ? (
            <Alert variant="destructive">
              <AlertTitle>Close match search failed</AlertTitle>
              <AlertDescription>{closeCandidateResult.error}</AlertDescription>
            </Alert>
          ) : closeLoading ? (
            <div className="text-muted-foreground flex min-h-32 items-center justify-center gap-2 text-sm">
              <Spinner />
              Finding close names…
            </div>
          ) : closeCandidateResult?.rowId === activeRow.id &&
            closeCandidates.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="font-medium">No close names found</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Try another spelling or skip this name.
              </p>
            </div>
          ) : closeCandidates.length > 0 ? (
            <CatalogImporterCandidateList
              ariaLabel="Close match results"
              candidates={closeCandidates}
              onChoose={chooseCandidate}
            />
          ) : null}
        </section>

        <div className="space-y-3 border-t pt-5">
          <div>
            <h3 className="font-semibold">Other match</h3>
            <p className="text-muted-foreground text-sm">
              Search another cultivar spelling.
            </p>
          </div>

          <form
            className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              searchInputRef.current?.blur();
              void searchCandidates(activeRow, reviewQuery);
            }}
          >
            <Input
              ref={searchInputRef}
              aria-label="Search a different cultivar spelling"
              value={reviewQuery}
              onChange={(event) => setReviewQuery(event.currentTarget.value)}
            />
            <Button type="button" variant="outline" onClick={resetSearch}>
              <RotateCcw className="size-4" />
              Reset
            </Button>
            <Button
              type="submit"
              disabled={searchLoading || reviewQuery.trim().length === 0}
            >
              {searchLoading ? <Spinner /> : <Search className="size-4" />}
              Search
            </Button>
          </form>

          {searchCandidateResult?.error &&
          searchCandidateResult.rowId === activeRow.id ? (
            <Alert variant="destructive">
              <AlertTitle>Candidate search failed</AlertTitle>
              <AlertDescription>{searchCandidateResult.error}</AlertDescription>
            </Alert>
          ) : searchLoading ? (
            <div className="text-muted-foreground flex min-h-32 items-center justify-center gap-2 text-sm">
              <Spinner />
              Searching other names…
            </div>
          ) : searchCandidateResult?.rowId === activeRow.id &&
            otherCandidates.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="font-medium">No other matches found</p>
            </div>
          ) : searchCandidateResult?.rowId === activeRow.id &&
            otherCandidates.length > 0 ? (
            <CatalogImporterCandidateList
              ariaLabel="Other match results"
              candidates={otherCandidates}
              startIndex={closeCandidates.length}
              onChoose={chooseCandidate}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
