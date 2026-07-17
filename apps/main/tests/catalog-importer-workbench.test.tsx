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
    expect(screen.getByText("Open spreadsheet")).toBeVisible();
    expect(screen.getByRole("button", { name: "Template" })).toBeVisible();
    expect(screen.getByText("Public")).toBeVisible();
    expect(screen.getByText("Pro test")).toBeVisible();
    expect(
      screen.getByText("Your spreadsheet stays in this browser."),
    ).toBeVisible();

    expect(
      screen.queryByText("Prepare a spreadsheet that imports perfectly"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/MVP imports/)).not.toBeInTheDocument();
  });
});
