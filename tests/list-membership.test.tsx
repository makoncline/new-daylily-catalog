import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";
const { useLiveQuery } = await import("@tanstack/react-db");

beforeEach(() => {
  localStorage.clear();
});

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
function CombinedViewer({
  listsCollection,
  listingsCollection,
}: {
  listsCollection: any;
  listingsCollection: any;
}) {
  const { data: allLists = [] } = useLiveQuery((q: any) =>
    q
      .from({ list: listsCollection })
      .orderBy(({ list }: any) => list.title ?? "", "asc"),
  );
  const { data: allListings = [] } = useLiveQuery((q: any) =>
    q
      .from({ listing: listingsCollection })
      .orderBy(({ listing }: any) => listing.title ?? "", "asc"),
  );

  return (
    <div>
      <div data-testid="lists-count">{allLists.length}</div>
      <div data-testid="listings-count">{allListings.length}</div>

      <div data-testid="list-titles">
        {allLists.map((l: any) => l.title).join(",")}
      </div>
      <div data-testid="listing-titles">
        {allListings.map((l: any) => l.title).join(",")}
      </div>

      <div data-testid="list-members">
        {allLists
          .map((l: any) => {
            const titles = (l.listings ?? [])
              .map(
                ({ id }: any) =>
                  allListings.find((x: any) => x.id === id)?.title,
              )
              .filter(Boolean)
              .join("|");
            return `${l.title}:${titles}`;
          })
          .join(",")}
      </div>

      <div data-testid="listing-lists">
        {allListings
          .map((li: any) => {
            const memberLists = allLists.filter((l: any) =>
              (l.listings ?? []).some((x: any) => x.id === li.id),
            );
            const names = memberLists.map((l: any) => l.title).join("|");
            return `${li.title}:${names}`;
          })
          .join(",")}
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

describe("list↔listing membership: add/remove and live derivations", () => {
  it("shows membership updates on both list and listing views", async () => {
    await withTempAppDb(async () => {
      const {
        listsCollection,
        insertList,
        addListingToList,
        removeListingFromList,
      } = await import("@/app/dashboard-two/_lib/lists-collection");
      const { listingsCollection, insertListing } = await import(
        "@/app/dashboard-two/_lib/listings-collection"
      );
      const { getTrpcClient } = await import("@/trpc/client");
      const client = getTrpcClient();

      await act(async () => {
        render(
          <CombinedViewer
            listsCollection={listsCollection}
            listingsCollection={listingsCollection}
          />,
        );
      });

      // starts empty
      await waitFor(() => {
        expect(screen.getByTestId("lists-count").textContent).toBe("0");
        expect(screen.getByTestId("listings-count").textContent).toBe("0");
      });

      // create one list and two listings
      await act(async () => {
        await insertList({ title: "L1" });
        await insertListing({ title: "A" });
        await insertListing({ title: "B" });
      });

      await waitFor(() => {
        expect(screen.getByTestId("lists-count").textContent).toBe("1");
        expect(screen.getByTestId("listings-count").textContent).toBe("2");
      });

      // get canonical ids
      const lists = await client.dashboardTwo.syncLists.query({ since: null });
      const listings = await client.dashboardTwo.syncListings.query({
        since: null,
      });
      const list = lists.find((l: any) => l.title === "L1");
      const listingA = listings.find((l: any) => l.title === "A");
      expect(list).toBeTruthy();
      expect(listingA).toBeTruthy();

      // ADD membership (L1 <- A)
      await act(async () => {
        await addListingToList({ listId: list!.id, listingId: listingA!.id });
      });

      await waitFor(() => {
        expect(screen.getByTestId("list-members").textContent).toContain(
          "L1:A",
        );
        expect(screen.getByTestId("listing-lists").textContent).toContain(
          "A:L1",
        );
      });

      // REMOVE membership (L1 -x A)
      await act(async () => {
        await removeListingFromList({
          listId: list!.id,
          listingId: listingA!.id,
        });
      });

      await waitFor(() => {
        const listMembers =
          screen.getByTestId("list-members").textContent ?? "";
        const listingLists =
          screen.getByTestId("listing-lists").textContent ?? "";
        expect(listMembers.includes("L1:A")).toBe(false);
        expect(listingLists.includes("A:L1")).toBe(false);
      });
    });
  });
});
