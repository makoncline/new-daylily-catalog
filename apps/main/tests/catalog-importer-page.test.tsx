import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CatalogImporterPage, {
  generateMetadata,
} from "@/app/(public)/catalog-importer/page";
import CatalogImporterLayout from "@/app/(public)/catalog-importer/layout";

const featureState = vi.hoisted(() => ({ discoveryEnabled: false }));

vi.mock("@/server/stripe/get-membership-price-display", () => ({
  getMembershipPriceDisplay: () =>
    Promise.resolve({
      amount: "$99",
      interval: "/yr",
      monthlyEquivalent: null,
    }),
}));

vi.mock("@/config/feature-flags", () => ({
  isCatalogImporterDiscoveryEnabled: () => featureState.discoveryEnabled,
}));

vi.mock(
  "@/app/(public)/catalog-importer/_components/catalog-importer-client",
  () => ({
    CatalogImporterClient: ({
      membershipStarted,
      viewerState,
    }: {
      membershipStarted: boolean;
      viewerState: string;
    }) => (
      <div>
        Spreadsheet tools · {viewerState} ·{" "}
        {membershipStarted ? "Trial started" : "No return state"}
      </div>
    ),
  }),
);

describe("catalog importer quiet launch", () => {
  it("keeps the direct page available while discovery is off", async () => {
    featureState.discoveryEnabled = false;

    render(await CatalogImporterPage());

    expect(
      screen.getByRole("heading", {
        name: "Build your daylily catalog",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(/Spreadsheet tools · anonymous · No return state/),
    ).toBeVisible();
    expect(generateMetadata().robots).toEqual({
      follow: false,
      index: false,
    });
  });

  it("centers the page in a landscape iPad-width layout container", () => {
    render(
      <CatalogImporterLayout>
        <div>Importer content</div>
      </CatalogImporterLayout>,
    );

    expect(screen.getByText("Importer content").parentElement).toHaveClass(
      "mx-auto",
      "w-full",
      "max-w-[1024px]",
    );
    expect(
      screen.getByText("Importer content").parentElement?.parentElement,
    ).toHaveClass("bg-background", "flex", "flex-1", "flex-col");
  });

  it("allows indexing only when importer discovery is enabled", () => {
    featureState.discoveryEnabled = true;

    expect(generateMetadata().robots).toBeUndefined();
  });
});
