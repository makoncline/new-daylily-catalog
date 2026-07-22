import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import {
  DashboardImportAlreadyExistingRows,
  DashboardImportExistingListingReview,
  type DashboardImportExistingMatchRow,
} from "@/app/dashboard/imports/_components/dashboard-import-existing-listings";
import type { CatalogImportRow } from "@/lib/catalog-importer";

const row: CatalogImportRow = {
  cultivarReferenceIdWarning: null,
  description: "Incoming description",
  duplicateAccepted: false,
  duplicateOfSourceRow: null,
  existingListingDecision: null,
  id: "source-row-9",
  imagePreviewAccepted: false,
  imageUrl: "",
  imageUrlWarning: null,
  linkProvenance: "exact-name",
  linkState: "linked",
  match: null,
  outputState: "included",
  price: 22,
  priceWarning: null,
  privateNote: "Holding area",
  rowKind: "listing",
  sourceCultivarReferenceId: "cultivar-1",
  sourceImageUrl: "",
  sourcePrice: "22.00",
  sourceRow: 9,
  sourceTitle: "Vanguard",
  suggestedMatch: null,
  title: "Vanguard",
};

function getMatchRow(kind: "exact" | "possible") {
  return {
    comparable: {
      cultivarReferenceId: "cultivar-1",
      description: "Incoming description",
      price: 22,
      privateNote: "Holding area",
      title: "Vanguard",
    },
    match: {
      kind,
      listings: [
        {
          cultivarReferenceId: "cultivar-1",
          description:
            kind === "exact" ? "Incoming description" : "Existing description",
          id: "listing-1",
          price: 22,
          privateNote: "Holding area",
          title: "Vanguard",
        },
      ],
    },
    row,
  } satisfies DashboardImportExistingMatchRow;
}

describe("dashboard import existing-listing decisions", () => {
  it("requires one explicit decision for a changed existing listing", () => {
    const setExistingListingDecision = vi.fn();
    const controller = {
      setExistingListingDecision,
    } as unknown as CatalogImporterWorkbenchController;

    render(
      <DashboardImportExistingListingReview
        completedCount={0}
        controller={controller}
        rows={[getMatchRow("possible")]}
        totalCount={1}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Keep existing listing" }),
    );
    expect(setExistingListingDecision).toHaveBeenCalledWith(
      row.id,
      "use-existing",
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Create new listing from spreadsheet",
      }),
    );
    expect(setExistingListingDecision).toHaveBeenCalledWith(row.id, "create");

    expect(
      screen.queryByRole("button", { name: "Exclude from import" }),
    ).not.toBeInTheDocument();
  });

  it("keeps exact matches visible with only a per-row create override", () => {
    const setExistingListingDecision = vi.fn();
    const controller = {
      setExistingListingDecision,
    } as unknown as CatalogImporterWorkbenchController;

    render(
      <DashboardImportAlreadyExistingRows
        controller={controller}
        rows={[getMatchRow("exact")]}
      />,
    );

    expect(
      screen.getByText("1 listing already exists and will be skipped"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create all/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create anyway" }));
    expect(setExistingListingDecision).toHaveBeenCalledWith(row.id, "create");
  });
});
