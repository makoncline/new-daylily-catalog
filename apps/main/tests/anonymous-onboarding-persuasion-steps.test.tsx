import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkflowStep } from "@/app/onboarding/anonymous-onboarding-persuasion-steps";
import {
  CultivarCollectionStep,
  ListingsWorkspaceStep,
} from "@/app/onboarding/anonymous-onboarding-product-steps";
import { createAnonymousOnboardingDraft } from "@/app/onboarding/anonymous-onboarding-draft";

const capturePosthogEventMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/analytics/posthog", () => ({
  capturePosthogEvent: capturePosthogEventMock,
}));

vi.mock("@/components/optimized-image", () => ({
  OptimizedImage: ({ alt }: { alt: string }) => (
    <div role="img" aria-label={alt} />
  ),
}));

vi.mock("@/hooks/use-listing-dialog-query-state", () => ({
  useListingDialogQueryState: () => ({ openListing: vi.fn() }),
}));

describe("persuasion-first onboarding steps", () => {
  it("captures the selected current workflow through the public step interface", async () => {
    const setWorkflow = vi.fn();
    const setCatalogSize = vi.fn();
    render(
      <WorkflowStep
        draft={createAnonymousOnboardingDraft()}
        setCatalogSize={setCatalogSize}
        setWorkflow={setWorkflow}
      />,
    );

    fireEvent.click(screen.getByTestId("onboarding-workflow-facebook"));

    expect(setWorkflow).toHaveBeenCalledWith("facebook");
  });

  it("lets a grower select a real enriched cultivar result", async () => {
    const addCultivarToCollection = vi.fn();
    const setCultivarQuery = vi.fn();
    const draft = createAnonymousOnboardingDraft({
      workflow: "document",
      catalogSize: "100_499",
    });
    render(
      <CultivarCollectionStep
        addCultivarToCollection={addCultivarToCollection}
        cultivarQuery="primal"
        cultivarSearchError={null}
        cultivarSearchIsLoading={false}
        cultivarSearchResults={[
          {
            cultivarReferenceId: "cr-primal",
            normalizedName: "primal scream",
            id: "v2-primal",
            name: "Primal Scream",
            ahsImageUrl: null,
            hybridizer: "Curt Hanson",
            year: "1994",
            scapeHeight: '34"',
            bloomSize: '7.5"',
            bloomSeason: "Early midseason",
            ploidy: "Tetraploid",
            foliageType: "Dormant",
            bloomHabit: null,
            color: "Orange",
            form: "Unusual form",
            parentage: null,
            fragrance: null,
            budcount: null,
            branches: null,
            sculpting: null,
            foliage: null,
            flower: null,
            image: { id: "image-primal", url: "/primal.jpg" },
          },
        ]}
        draft={draft}
        removeCultivarFromCollection={vi.fn()}
        setCultivarQuery={setCultivarQuery}
      />,
    );

    expect(screen.getByText("Curt Hanson · 1994")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /add primal scream/i }));
    expect(addCultivarToCollection).toHaveBeenCalledWith(
      expect.objectContaining({ cultivarReferenceId: "cr-primal" }),
    );
  });

  it("edits the browser-only inventory through the listings workspace", () => {
    const updateCollectionItem = vi.fn();
    const draft = createAnonymousOnboardingDraft({
      collection: [
        {
          cultivarReferenceId: "cr-primal",
          name: "Primal Scream",
          hybridizer: "Curt Hanson",
          year: "1994",
          imageUrl: "/primal.jpg",
          scapeHeight: '34"',
          bloomSize: '7.5"',
          bloomSeason: "Early midseason",
          form: "Unusual form",
          ploidy: "Tetraploid",
          foliageType: "Dormant",
          color: "Orange",
          fragrance: null,
          parentage: null,
          quantity: 1,
          price: 25,
          status: "for_sale",
          description: "Healthy double fan",
        },
      ],
    });

    render(
      <ListingsWorkspaceStep
        draft={draft}
        updateCollectionItem={updateCollectionItem}
      />,
    );
    fireEvent.change(screen.getByLabelText("Price for Primal Scream"), {
      target: { value: "32" },
    });
    expect(updateCollectionItem).toHaveBeenCalledWith("cr-primal", {
      price: 32,
    });
  });
});
