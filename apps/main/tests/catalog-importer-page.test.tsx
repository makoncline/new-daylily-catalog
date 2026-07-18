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
        name: "Free daylily catalog spreadsheet cleaner",
      }),
    ).toBeVisible();
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
