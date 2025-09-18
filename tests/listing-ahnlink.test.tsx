import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";
const { useLiveQuery } = await import("@tanstack/react-db");

beforeEach(() => {
  localStorage.clear();
});

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
function ListingsWithAhsViewer({
  listingsCollection,
  ahsCollection,
}: {
  listingsCollection: any;
  ahsCollection: any;
}) {
  const { data: listings = [] } = useLiveQuery((q: any) =>
    q
      .from({ listing: listingsCollection })
      .orderBy(({ listing }: any) => (listing.title ?? "") as string, "asc"),
  );
  const { data: ahsRows = [] } = useLiveQuery((q: any) =>
    q
      .from({ ahs: ahsCollection })
      .orderBy(({ ahs }: any) => (ahs.name ?? "") as string, "asc"),
  );

  return (
    <div>
      <div data-testid="listings-count">{listings.length}</div>
      <div data-testid="rows">
        {listings
          .map((l: any) => {
            const ahs = l.ahsId
              ? ahsRows.find((a: any) => a.id === l.ahsId)
              : null;
            const name = ahs?.name ?? "";
            return `${l.title}:${name}`;
          })
          .join(",")}
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

describe("listing ↔ AHS linking shows derived AHS data", () => {
  it("links a listing to an AHS row and shows its name via live queries", async () => {
    await withTempAppDb(async () => {
      const { db } = await import("@/server/db");
      // Seed an AHS listing directly (read-only domain)
      const seededAhs = await db.ahsListing.create({
        data: { name: "AHS-Alpha" },
      });

      const { listingsCollection, insertListing, setListingAhsId } =
        await import("@/lib/listings-collection");
      const { ahsCollection } = await import("@/lib/ahs-collection");
      const { getTrpcClient } = await import("@/trpc/client");
      const client = getTrpcClient();

      await act(async () => {
        render(
          <ListingsWithAhsViewer
            listingsCollection={listingsCollection}
            ahsCollection={ahsCollection}
          />,
        );
      });

      // Start with no listings
      await waitFor(() => {
        expect(screen.getByTestId("listings-count").textContent).toBe("0");
        expect(screen.getByTestId("rows").textContent).toBe("");
      });

      // Create a listing
      await act(async () => {
        await insertListing({ title: "L1" });
      });

      // Resolve canonical listing id
      const allListings = await client.dashboardTwo.syncListings.query({
        since: null,
      });
      const inserted = allListings.find((x) => x.title === "L1");
      expect(inserted).toBeTruthy();
      const listingId = inserted!.id;

      // Link listing to seeded AHS
      await act(async () => {
        await setListingAhsId({ id: listingId, ahsId: seededAhs.id });
      });

      await waitFor(() => {
        const rows = screen.getByTestId("rows").textContent ?? "";
        expect(rows).toContain("L1:AHS-Alpha");
      });
    });
  });
});
