import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CatalogImporterPage, {
  generateMetadata,
} from "@/app/(public)/catalog-importer/page";

const featureState = vi.hoisted(() => ({
  discoveryEnabled: false,
}));

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
  beforeEach(() => {
    featureState.discoveryEnabled = false;
  });

  it("keeps the direct page available while discovery is off", async () => {
    featureState.discoveryEnabled = false;

    render(await CatalogImporterPage());

    expect(
      screen.getByRole("heading", {
        name: "Turn the catalog you already have into one buyers can browse",
      }),
    ).toBeVisible();
    expect(screen.getByText("Spreadsheet tools")).toBeVisible();
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
