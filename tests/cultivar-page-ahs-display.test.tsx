import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CultivarPageAhsDisplay } from "@/app/(public)/cultivar/[cultivarNormalizedName]/_components/cultivar-page-ahs-display";

describe("CultivarPageAhsDisplay", () => {
  it("renders image, heading, hybridizer/year text, and no image popover icon", () => {
    render(
      <CultivarPageAhsDisplay
        ahsListing={{
          id: "ahs-1",
          name: "Coffee Frenzy",
          ahsImageUrl: "/assets/bouquet.png",
          hybridizer: "Reed",
          year: "2012",
          scapeHeight: "30",
          bloomSize: null,
          bloomSeason: null,
          form: null,
          ploidy: "Tet",
          foliageType: null,
          bloomHabit: null,
          budcount: null,
          branches: null,
          sculpting: null,
          foliage: null,
          flower: null,
          fragrance: null,
          parentage: null,
          color: "Coffee Brown",
        }}
      />,
    );

    expect(
      screen.getByRole("img", { name: /Coffee Frenzy AHS image/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 1, name: "Coffee Frenzy" }),
    ).toBeVisible();
    expect(screen.getByText("(Reed, 2012)")).toBeVisible();
    expect(screen.getByText("Scape Height")).toBeVisible();
    expect(screen.getByText("Color")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /View .*image/i }),
    ).not.toBeInTheDocument();
  });
});
