import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { CatalogImporterWorkbench } from "@/app/(public)/catalog-importer/_components/catalog-importer-workbench";

describe("CatalogImporterWorkbench", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts with one clear upload path and concise supporting controls", () => {
    render(<CatalogImporterWorkbench />);

    expect(
      screen.getByRole("heading", {
        name: "Clean a daylily spreadsheet",
      }),
    ).toBeVisible();
    expect(
      screen.getByText("Drop a spreadsheet here, or choose a file"),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Download template" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Your workbook stays local; cultivar names are sent for matching.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "Catalog import progress" }),
    ).toBeVisible();

    expect(
      screen.queryByText("Prepare a spreadsheet that imports perfectly"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/MVP imports/)).not.toBeInTheDocument();
  });
});
