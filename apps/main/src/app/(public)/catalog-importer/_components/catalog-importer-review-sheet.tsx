"use client";

import { useEffect, useRef } from "react";
import { Search, SkipForward } from "lucide-react";
import { TableImagePreview } from "@/components/data-table/table-image-preview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CultivarMatchCandidate } from "@/lib/catalog-importer";
import {
  getCandidateMeta,
  getCultivarImage,
  getCultivarTraitSummary,
} from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";

interface CatalogImporterReviewSheetProps {
  controller: CatalogImporterWorkbenchController;
  onOpenChange: (open: boolean) => void;
}

function CandidateImage({ candidate }: { candidate: CultivarMatchCandidate }) {
  const image = getCultivarImage(candidate);

  return image ? (
    <TableImagePreview images={[]} cultivarReferenceImage={image} />
  ) : (
    <div className="bg-muted text-muted-foreground flex size-16 items-center justify-center rounded-md border text-xs">
      No photo
    </div>
  );
}

function UseCandidateButton({
  candidate,
  controller,
}: {
  candidate: CultivarMatchCandidate;
  controller: CatalogImporterWorkbenchController;
}) {
  const activeRow = controller.activeReviewRow;
  if (!activeRow) return null;

  return (
    <Button
      type="button"
      size="sm"
      onClick={() =>
        controller.finishReviewRow(activeRow.id, {
          match: candidate,
          matchStatus: "selected",
          skipped: false,
        })
      }
    >
      Use match
    </Button>
  );
}

export function CatalogImporterReviewSheet({
  controller,
  onOpenChange,
}: CatalogImporterReviewSheetProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeRow = controller.activeReviewRow;
  const candidateResult = controller.candidateResult;
  const candidates =
    candidateResult && candidateResult.rowId === activeRow?.id
      ? candidateResult.candidates
      : [];
  const loading = Boolean(
    candidateResult &&
      candidateResult.rowId === activeRow?.id &&
      candidateResult.loading,
  );

  useEffect(() => {
    if (activeRow) {
      window.setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [activeRow]);

  return (
    <Sheet open={Boolean(activeRow)} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none lg:w-[min(60rem,92vw)] lg:max-w-[60rem]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchInputRef.current?.focus();
        }}
      >
        {activeRow ? (
          <>
            <SheetHeader className="border-b p-5 pr-12 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  Source row {activeRow.sourceRow}
                </Badge>
                <Badge variant="secondary">Needs review</Badge>
              </div>
              <SheetTitle>Find a match for {activeRow.title}</SheetTitle>
              <SheetDescription>
                Search another spelling, choose a registered cultivar, keep the
                original name, or omit this row.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 border-b p-5">
              <form
                className="flex min-w-0 gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void controller.loadCandidates(
                    activeRow,
                    controller.reviewQuery,
                  );
                }}
              >
                <Input
                  ref={searchInputRef}
                  aria-label="Search a different cultivar spelling"
                  value={controller.reviewQuery}
                  onChange={(event) =>
                    controller.setReviewQuery(event.currentTarget.value)
                  }
                />
                <Button
                  type="submit"
                  disabled={
                    loading || controller.reviewQuery.trim().length === 0
                  }
                >
                  {loading ? <Spinner /> : <Search className="size-4" />}
                  Search
                </Button>
              </form>

              <div className="grid gap-2 lg:flex lg:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    controller.finishReviewRow(activeRow.id, {
                      match: null,
                      matchStatus: "unmatched",
                      skipped: false,
                    })
                  }
                >
                  Keep without match
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    controller.finishReviewRow(activeRow.id, {
                      match: null,
                      matchStatus: "pending",
                      skipped: true,
                    })
                  }
                >
                  <SkipForward className="size-4" />
                  Omit row
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {candidateResult?.error &&
              candidateResult.rowId === activeRow.id ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Candidate search failed</AlertTitle>
                  <AlertDescription>{candidateResult.error}</AlertDescription>
                </Alert>
              ) : null}

              {loading ? (
                <div className="text-muted-foreground flex min-h-40 items-center justify-center gap-2 text-sm">
                  <Spinner />
                  Looking for close cultivar names…
                </div>
              ) : candidateResult?.rowId === activeRow.id &&
                !candidateResult.error &&
                candidates.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="font-medium">No close cultivar names found</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Try another spelling or keep the row without a match.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 lg:hidden">
                    {candidates.map((candidate) => (
                      <article
                        key={candidate.cultivarReferenceId}
                        className="space-y-4 rounded-lg border p-4"
                      >
                        <div className="flex gap-3">
                          <CandidateImage candidate={candidate} />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium">
                              {candidate.displayName}
                            </h3>
                            <p className="text-muted-foreground mt-1 text-sm">
                              {getCandidateMeta(candidate) ||
                                "Hybridizer and year unavailable"}
                            </p>
                            <Badge variant="secondary" className="mt-2">
                              {candidate.confidence}% similar
                            </Badge>
                          </div>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {getCultivarTraitSummary(candidate).join(" · ") ||
                            "Registry traits unavailable"}
                        </p>
                        <UseCandidateButton
                          candidate={candidate}
                          controller={controller}
                        />
                      </article>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto rounded-md border lg:block">
                    <Table>
                      <caption className="sr-only">
                        Candidate cultivar matches for {activeRow.title}
                      </caption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Photo</TableHead>
                          <TableHead>Registered cultivar</TableHead>
                          <TableHead>Hybridizer / year</TableHead>
                          <TableHead>Registry traits</TableHead>
                          <TableHead className="text-right">
                            Similarity
                          </TableHead>
                          <TableHead>
                            <span className="sr-only">Choose match</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {candidates.map((candidate) => (
                          <TableRow key={candidate.cultivarReferenceId}>
                            <TableCell>
                              <CandidateImage candidate={candidate} />
                            </TableCell>
                            <TableCell className="max-w-52 font-medium whitespace-normal">
                              {candidate.displayName}
                            </TableCell>
                            <TableCell className="text-muted-foreground whitespace-normal">
                              {getCandidateMeta(candidate) || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-72 whitespace-normal">
                              {getCultivarTraitSummary(candidate).join(" · ") ||
                                "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {candidate.confidence}%
                            </TableCell>
                            <TableCell>
                              <UseCandidateButton
                                candidate={candidate}
                                controller={controller}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
