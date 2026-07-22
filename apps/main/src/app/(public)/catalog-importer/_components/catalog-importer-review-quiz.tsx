"use client";

import { type KeyboardEvent, useCallback, useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import type {
  CatalogImportRow,
  CultivarMatchCandidate,
} from "@/lib/catalog-importer";
import {
  CatalogImporterCandidateList,
  CatalogImporterSourceRow,
  EXCLUDE_FROM_CATALOG_SHORTCUT,
  LEAVE_UNMATCHED_SHORTCUT,
} from "@/app/(public)/catalog-importer/_components/catalog-importer-match-options";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";

interface CatalogImporterReviewQuizProps {
  controller: CatalogImporterWorkbenchController;
  destination?: "import" | "workbook";
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
  destination = "workbook",
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
        ? closeCandidateResult.candidates.slice(0, 3)
        : [],
    [activeRow?.id, closeCandidateResult],
  );
  const closeLoading = Boolean(
    closeCandidateResult &&
      closeCandidateResult.rowId === activeRow?.id &&
      closeCandidateResult.loading,
  );
  const canMove = controller.reviewRows.length > 1;
  const focusReview = useCallback((review: HTMLElement | null) => {
    review?.focus();
  }, []);

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

    if (/^[1-3]$/.test(event.key)) {
      const choiceIndex = Number(event.key) - 1;
      const candidate = closeCandidates[choiceIndex];
      if (candidate) {
        event.preventDefault();
        chooseCandidate(candidate);
      }
      return;
    }

    const shortcut = event.key.toUpperCase();
    if (shortcut === LEAVE_UNMATCHED_SHORTCUT) {
      event.preventDefault();
      skipReviewRow();
    } else if (shortcut === EXCLUDE_FROM_CATALOG_SHORTCUT) {
      event.preventDefault();
      excludeReviewRow();
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
      key={activeRow.id}
      ref={focusReview}
      id="catalog-importer-review-quiz"
      role="region"
      aria-labelledby="catalog-importer-review-heading"
      aria-keyshortcuts={
        canMove ? "1 2 3 U X ArrowLeft ArrowRight" : "1 2 3 U X"
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
            <Kbd asChild className="size-10 text-base font-semibold">
              <button
                type="button"
                aria-label="Previous unmatched name"
                aria-keyshortcuts="ArrowLeft"
                onClick={() => controller.moveReviewRow(-1)}
              >
                ←
              </button>
            </Kbd>
            <Kbd asChild className="size-10 text-base font-semibold">
              <button
                type="button"
                aria-label="Next unmatched name"
                aria-keyshortcuts="ArrowRight"
                onClick={() => controller.moveReviewRow(1)}
              >
                →
              </button>
            </Kbd>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
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
            destination={destination}
            onChoose={chooseCandidate}
            onExclude={excludeReviewRow}
            onLeaveUnmatched={skipReviewRow}
          />
        )}
        <div className="flex flex-wrap gap-1">
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
      </div>
    </section>
  );
}
