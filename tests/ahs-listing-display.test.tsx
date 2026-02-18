import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AhsListingDisplay } from "@/components/ahs-listing-display";
import { type RouterOutputs } from "@/trpc/react";

type AhsListing = NonNullable<RouterOutputs["public"]["getListing"]["ahsListing"]>;

function createAhsListing(overrides: Partial<AhsListing> = {}): AhsListing {
  return {
    name: "Aces Full",
    ahsImageUrl: null,
    hybridizer: "Hansen-D.",
    year: "2010",
    scapeHeight: null,
    bloomSize: null,
    bloomSeason: null,
    form: null,
    ploidy: null,
    foliageType: null,
    bloomHabit: null,
    budcount: null,
    branches: null,
    sculpting: null,
    foliage: null,
    flower: null,
    fragrance: null,
    parentage: null,
    color: null,
    ...overrides,
  };
}

describe("AhsListingDisplay", () => {
  it("does not render a cultivar link", () => {
    render(<AhsListingDisplay ahsListing={createAhsListing()} />);

    expect(screen.queryByRole("link", { name: "View linked cultivar page" })).toBeNull();
  });
});
