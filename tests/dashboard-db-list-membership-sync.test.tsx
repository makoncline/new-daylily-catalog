import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useLiveQuery } from "@tanstack/react-db";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";

beforeEach(() => {
  localStorage.clear();
});

function RawMembershipIdsViewer({
  listsCollection,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listsCollection: any;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allLists = [] } = useLiveQuery((q: any) =>
    q
      .from({ list: listsCollection })
      .orderBy(({ list }: any) => (list.title ?? "") as string, "asc"),
  );

  return (
    <div data-testid="raw-membership">
      {allLists
        .map((l: any) => {
          const ids = (l.listings ?? []).map((x: any) => x.id).join("|");
          return `${l.title}:${ids}`;
        })
        .join(",")}
    </div>
  );
}

describe("dashboardDb list membership sync", () => {
  it("deleting a listing clears list membership on next incremental sync", async () => {
    await withTempAppDb(async ({ user }) => {
      const {
        listsCollection,
        insertList,
        addListingToList,
        initializeListsCollection,
      } = await import("@/app/dashboard/_lib/dashboard-db/lists-collection");

      const {
        insertListing,
        deleteListing,
        initializeListingsCollection,
      } = await import("@/app/dashboard/_lib/dashboard-db/listings-collection");

      await act(async () => {
        await initializeListsCollection(user.id);
        await initializeListingsCollection(user.id);
        render(<RawMembershipIdsViewer listsCollection={listsCollection} />);
      });

      let oldListId = "";
      let listingId = "";
      await act(async () => {
        const oldList = await insertList({ title: "Old" });
        oldListId = oldList.id;

        const listing = await insertListing({ title: "A" });
        listingId = listing.id;

        await addListingToList({ listId: oldListId, listingId });

        // Create a newer list so the cursor's max(updatedAt) is > Old.updatedAt.
        await new Promise((r) => setTimeout(r, 10));
        await insertList({ title: "New" });
      });

      await waitFor(() => {
        const text = screen.getByTestId("raw-membership").textContent ?? "";
        expect(text).toContain(`Old:${listingId}`);
      });

      // Advance the lists cursor to the max(updatedAt) across lists (the "New" list).
      await act(async () => {
        await listsCollection.utils.refetch();
      });

      await act(async () => {
        await deleteListing({ id: listingId });
      });

      await act(async () => {
        await listsCollection.utils.refetch();
      });

      await waitFor(() => {
        const text = screen.getByTestId("raw-membership").textContent ?? "";
        expect(text).toContain("Old:");
        expect(text).not.toContain(listingId);
      });
    });
  });
});

