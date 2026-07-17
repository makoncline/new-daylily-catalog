"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  SkipForward,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        match: candidate,
        matchStatus: "selected",
        skipped: false,
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        isTypingTarget(event.target) ||
        document.querySelector('[role="dialog"]')
      ) {
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

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveReviewRow(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveReviewRow(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [chooseCandidate, keyboardCandidates, moveReviewRow]);

  if (!activeRow) {
    return (
      <Card>
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>
            Review complete
          </CardTitle>
          <CardDescription>
            Every uncertain name has been matched or skipped.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const activePosition = controller.activeReviewIndex + 1;
  return (
    <Card
      id="catalog-importer-review-quiz"
      role="region"
      aria-labelledby="catalog-importer-review-heading"
      className="overflow-hidden"
    >
      <CardHeader className="gap-4 border-b lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="space-y-1">
          <CardTitle
            id="catalog-importer-review-heading"
            role="heading"
            aria-level={2}
          >
            Match unmatched names
          </CardTitle>
          <CardDescription className="tabular-nums">
            {controller.reviewRows.length.toLocaleString()} manual{" "}
            {controller.reviewRows.length === 1 ? "match" : "matches"} remaining
            {activePosition > 0
              ? ` · ${activePosition.toLocaleString()} of ${controller.reviewRows.length.toLocaleString()}`
              : ""}
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground hidden text-xs lg:inline">
            <kbd className="font-mono">1–9</kbd> choose ·{" "}
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
          <Button
            type="button"
            variant="outline"
            onClick={controller.skipReviewRow}
          >
            <SkipForward className="size-4" />
            Skip
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-4 lg:p-6">
        <CatalogImporterSourceRow
          row={activeRow}
          sourceCells={controller.activeReviewSourceCells}
        />

        <div className="space-y-3">
          <div>
            <h3 className="font-semibold">Close matches</h3>
            <p className="text-muted-foreground text-sm">
              Best matches for {activeRow.title}.
            </p>
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
        </div>

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
      </CardContent>
    </Card>
  );
}
