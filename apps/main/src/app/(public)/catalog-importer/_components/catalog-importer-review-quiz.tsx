"use client";

import { type KeyboardEvent, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type {
  CatalogImportRow,
  CultivarMatchCandidate,
} from "@/lib/catalog-importer";
import {
  CatalogImporterCandidateList,
  CatalogImporterSourceRow,
} from "@/app/(public)/catalog-importer/_components/catalog-importer-match-options";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";

interface CatalogImporterReviewQuizProps {
  controller: CatalogImporterWorkbenchController;
  onFindDifferentCultivar: (row: CatalogImportRow) => void;
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
  onFindDifferentCultivar,
}: CatalogImporterReviewQuizProps) {
  const activeRow = controller.activeReviewRow;
  const closeCandidateResult = controller.candidateResult;
  const finishReviewRow = controller.finishReviewRow;
  const moveReviewRow = controller.moveReviewRow;
  const excludeReviewRow = controller.excludeReviewRow;
  const skipReviewRow = controller.skipReviewRow;
  const closeCandidates = useMemo(
    () =>
      closeCandidateResult && closeCandidateResult.rowId === activeRow?.id
        ? closeCandidateResult.candidates.slice(0, 5)
        : [],
    [activeRow?.id, closeCandidateResult],
  );
  const closeLoading = Boolean(
    closeCandidateResult &&
      closeCandidateResult.rowId === activeRow?.id &&
      closeCandidateResult.loading,
  );
  const canMove = controller.reviewRows.length > 1;

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

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.repeat || isTypingTarget(event.target)) {
      return;
    }

    if (/^[1-9]$/.test(event.key)) {
      const choiceIndex = Number(event.key) - 1;
      const candidate = closeCandidates[choiceIndex];
      if (candidate) {
        event.preventDefault();
        chooseCandidate(candidate);
      } else if (choiceIndex === closeCandidates.length) {
        event.preventDefault();
        skipReviewRow();
      } else if (choiceIndex === closeCandidates.length + 1) {
        event.preventDefault();
        excludeReviewRow();
      }
      return;
    }

    if (event.key.toLowerCase() === "x" && canMove) {
      event.preventDefault();
      moveReviewRow(1);
    } else if (event.key === "ArrowLeft" && canMove) {
      event.preventDefault();
      moveReviewRow(-1);
    } else if (event.key === "ArrowRight" && canMove) {
      event.preventDefault();
      moveReviewRow(1);
    }
  };

  if (!activeRow) {
    return null;
  }

  return (
    <section
      id="catalog-importer-review-quiz"
      role="region"
      aria-labelledby="catalog-importer-review-heading"
      aria-keyshortcuts={
        canMove
          ? "1 2 3 4 5 6 7 8 9 X ArrowLeft ArrowRight"
          : "1 2 3 4 5 6 7 8 9"
      }
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="focus-visible:ring-ring !scroll-mt-16 outline-none focus-visible:ring-2"
    >
      <div className="flex items-center justify-between gap-3 pb-4">
        <div className="min-w-0">
          <h2
            id="catalog-importer-review-heading"
            className="text-xl font-semibold tracking-tight"
          >
            Review potential matches
          </h2>
          <p className="text-muted-foreground text-sm tabular-nums">
            {controller.completedReviewCount.toLocaleString()} of{" "}
            {controller.reviewProgressTotal.toLocaleString()} completed
          </p>
        </div>

        {canMove ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-muted-foreground hidden text-xs lg:inline">
              <kbd className="font-mono">1–9</kbd> select ·{" "}
              <kbd className="font-mono">X</kbd> decide later ·{" "}
              <kbd className="font-mono">← →</kbd> move
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10"
              aria-label="Decide later"
              aria-keyshortcuts="X"
              title="Decide later (X)"
              onClick={() => moveReviewRow(1)}
            >
              <SkipForward className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10"
              aria-label="Previous unmatched name"
              onClick={() => controller.moveReviewRow(-1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10"
              aria-label="Next unmatched name"
              onClick={() => controller.moveReviewRow(1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground hidden text-xs lg:inline">
            <kbd className="font-mono">1–9</kbd> select
          </span>
        )}
      </div>

      <div className="space-y-2">
        <CatalogImporterSourceRow
          row={activeRow}
          sourceCells={controller.activeReviewSourceCells}
        />

        {closeCandidateResult?.error &&
        closeCandidateResult.rowId === activeRow.id ? (
          <Alert variant="destructive">
            <AlertTitle>Match search failed</AlertTitle>
            <AlertDescription>{closeCandidateResult.error}</AlertDescription>
          </Alert>
        ) : null}
        {closeLoading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
            <Spinner />
            Finding matches…
          </div>
        ) : (
          <CatalogImporterCandidateList
            ariaLabel="Match options"
            candidates={closeCandidates}
            onChoose={chooseCandidate}
            onExclude={excludeReviewRow}
            onLeaveUnmatched={skipReviewRow}
          />
        )}
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-3 py-1"
          onClick={() => onFindDifferentCultivar(activeRow)}
        >
          Find a different cultivar
        </Button>
      </div>
    </section>
  );
}
