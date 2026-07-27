import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CatalogImporterCheckoutPage from "@/app/catalog-importer/checkout/page";
import OnboardingPage from "@/app/onboarding/page";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  userId: null as string | null,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: mocks.userId }),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/server/stripe/get-membership-price-display", () => ({
  getMembershipPriceDisplay: () =>
    Promise.resolve({
      amount: "$99",
      interval: "/yr",
      monthlyEquivalent: null,
    }),
}));

vi.mock(
  "@/app/catalog-importer/checkout/catalog-importer-checkout-start",
  () => ({
    CatalogImporterCheckoutStart: ({
      checkoutSource,
    }: {
      checkoutSource: { conversionId: string };
    }) => <div>Importer checkout {checkoutSource.conversionId}</div>,
  }),
);

describe("catalog importer checkout routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userId = null;
  });

  it("replaces the old setup entry with the catalog importer", async () => {
    await expect(OnboardingPage()).rejects.toThrow(
      "redirect:/catalog-importer",
    );
  });

  it("redirects a verified legacy handoff to the importer checkout", async () => {
    const conversionId = "12a94b5f-3da4-4d28-b6df-76f8f4bc8392";

    await expect(
      OnboardingPage({
        searchParams: Promise.resolve({
          conversion_id: conversionId,
          entry: "catalog_importer",
          return_to: "/catalog-importer",
        }),
      }),
    ).rejects.toThrow(
      `redirect:/catalog-importer/checkout?conversion_id=${conversionId}&entry=catalog_importer&return_to=%2Fcatalog-importer`,
    );
  });

  it("renders the verified importer checkout for signed-out sellers", async () => {
    const conversionId = "12a94b5f-3da4-4d28-b6df-76f8f4bc8392";

    render(
      await CatalogImporterCheckoutPage({
        searchParams: Promise.resolve({
          conversion_id: conversionId,
          entry: "catalog_importer",
          return_to: "/catalog-importer",
        }),
      }),
    );
    expect(screen.getByText(`Importer checkout ${conversionId}`)).toBeVisible();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
