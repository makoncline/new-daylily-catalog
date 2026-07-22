"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const [searchQuery, setSearchQuery] = useState(row?.title ?? "");
  const closeRequestId = useRef(0);

  const loadCloseMatches = useCallback(
    async (activeRow: CatalogImportRow, query: string) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) return;

      const requestId = closeRequestId.current + 1;
      closeRequestId.current = requestId;
      const isOriginalQuery =
        trimmedQuery.toLocaleLowerCase() ===
        activeRow.title.trim().toLocaleLowerCase();
      const currentCandidates = isOriginalQuery
        ? [activeRow.match, activeRow.suggestedMatch]
        : [];
      setCloseResult({
        candidates: uniqueCandidates(currentCandidates),
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
        if (closeRequestId.current !== requestId) {
          return;
        }

        setCloseResult({
          candidates: uniqueCandidates([
            ...currentCandidates,
            ...(result?.candidates ?? []),
          ]),
          error: null,
          loading: false,
          query: trimmedQuery,
          rowId: activeRow.id,
        });
      } catch (error) {
        if (closeRequestId.current !== requestId) {
          return;
        }

        setCloseResult({
          candidates: uniqueCandidates(currentCandidates),
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
        ? (closeResult?.candidates ?? []).slice(0, 3)
        : [],
    [closeResult, row?.id],
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

  const leaveUnmatched = useCallback(() => {
    if (!row) {
      return;
    }

    controller.leaveRowUnmatched(row.id);
    onOpenChange(false);
  }, [controller, onOpenChange, row]);

  if (!row) {
    return null;
  }

  const closeLoading = closeResult?.rowId === row.id && closeResult.loading;

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

          const choiceIndex = Number(event.key) - 1;
          const candidate = closeCandidates[choiceIndex];
          if (candidate) {
            event.preventDefault();
            chooseCandidate(candidate);
          } else if (choiceIndex === closeCandidates.length) {
            event.preventDefault();
            leaveUnmatched();
          }
        }}
        onOpenAutoFocus={() => {
          void loadCloseMatches(row, row.title);
        }}
      >
        <SheetHeader className="border-b p-4 pr-12 text-left sm:p-6 sm:pr-12">
          <SheetTitle>Change cultivar match</SheetTitle>
          <SheetDescription>
            Choose a match for {row.sourceTitle}.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2 p-4 sm:p-6">
          <CatalogImporterSourceRow
            row={row}
            sourceCells={controller.getSourceCellsForRow(row)}
          />

          <form
            className="py-1"
            onSubmit={(event) => {
              event.preventDefault();
              void loadCloseMatches(row, searchQuery);
            }}
          >
            <InputGroup>
              <InputGroupInput
                aria-label="Cultivar name"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={!searchQuery.trim() || closeLoading}
                >
                  {closeLoading ? <Spinner data-icon="inline-start" /> : null}
                  Search
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>

          {closeResult?.error && closeResult.rowId === row.id ? (
            <Alert variant="destructive">
              <AlertTitle>Match search failed</AlertTitle>
              <AlertDescription>{closeResult.error}</AlertDescription>
            </Alert>
          ) : null}
          {closeLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
              <Spinner />
              Finding matches…
            </div>
          ) : (
            <>
              {closeResult && closeCandidates.length === 0 ? (
                <Empty className="py-8">
                  <EmptyHeader>
                    <EmptyTitle>No matches found</EmptyTitle>
                    <EmptyDescription>Try another name.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : null}
              <CatalogImporterCandidateList
                ariaLabel="Match options"
                candidates={closeCandidates}
                onChoose={chooseCandidate}
                onLeaveUnmatched={leaveUnmatched}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
