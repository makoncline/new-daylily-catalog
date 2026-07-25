import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DashboardImportAlreadyExistingRows,
  type DashboardImportExistingMatchRow,
} from "@/app/dashboard/imports/_components/dashboard-import-existing-listings";
import type { CatalogImportRow } from "@/lib/catalog-importer";

const row: CatalogImportRow = {
  cultivarReferenceIdWarning: null,
  description: "Incoming description",
  duplicateAccepted: false,
  duplicateOfSourceRow: null,
  id: "source-row-9",
  linkProvenance: "exact-name",
  linkState: "linked",
  match: null,
  outputState: "included",
  price: 22,
  priceWarning: null,
  privateNote: "Holding area",
  rowKind: "listing",
  sourceCultivarReferenceId: "cultivar-1",
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

describe("dashboard existing listings", () => {
  it("shows existing listings without a create override", () => {
    render(
      <DashboardImportAlreadyExistingRows rows={[getMatchRow("exact")]} />,
    );

    expect(
      screen.getByText("1 existing listing will be skipped"),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Row" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Vanguard" })).toHaveAttribute(
      "href",
      "/dashboard/listings?editing=listing-1",
    );
    expect(screen.getByText("$22.00")).toBeVisible();
    expect(screen.getByText("Incoming description")).toBeVisible();
    expect(screen.getByText("Holding area")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Create anyway" }),
    ).not.toBeInTheDocument();
  });
});
