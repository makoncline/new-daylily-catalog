import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CatalogImporterPage, {
  generateMetadata,
} from "@/app/(public)/catalog-importer/page";

const featureState = vi.hoisted(() => ({ discoveryEnabled: false }));

vi.mock("@/config/feature-flags", () => ({
  isCatalogImporterDiscoveryEnabled: () => featureState.discoveryEnabled,
}));

vi.mock(
  "@/app/(public)/catalog-importer/_components/catalog-importer-client",
  () => ({
    CatalogImporterClient: () => <div>Spreadsheet tools</div>,
  }),
);

describe("catalog importer quiet launch", () => {
  it("keeps the direct page available while discovery is off", () => {
    featureState.discoveryEnabled = false;

    render(<CatalogImporterPage />);

    expect(
      screen.getByRole("heading", {
        name: "Turn your daylily spreadsheet into a catalog-ready collection",
      }),
    ).toBeVisible();
    expect(screen.getByText("Processed in your browser")).toBeVisible();
    expect(
      screen.getByText("Complete workbook not saved to our database"),
    ).toBeVisible();
    expect(screen.getByText("Nothing published")).toBeVisible();
    expect(generateMetadata().robots).toEqual({
      follow: false,
      index: false,
    });
  });

  it("allows indexing only when importer discovery is enabled", () => {
    featureState.discoveryEnabled = true;

    expect(generateMetadata().robots).toBeUndefined();
  });
});
