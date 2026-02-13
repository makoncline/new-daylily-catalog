import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useLiveQuery } from "@tanstack/react-db";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";

beforeEach(() => {
  localStorage.clear();
});

function ListingsViewer({
  listingsCollection,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listingsCollection: any;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items = [] } = useLiveQuery((q: any) =>
    q
      .from({ listing: listingsCollection })
      .orderBy(({ listing }: any) => (listing.title ?? "") as string, "asc"),
  );

  return (
    <div>
      <div data-testid="count">{items.length}</div>
      <div data-testid="titles">{items.map((i: any) => i.title).join(",")}</div>
    </div>
  );
}

function MembershipViewer({
  listsCollection,
  listingsCollection,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listsCollection: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listingsCollection: any;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allLists = [] } = useLiveQuery((q: any) =>
    q
      .from({ list: listsCollection })
      .orderBy(({ list }: any) => (list.title ?? "") as string, "asc"),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allListings = [] } = useLiveQuery((q: any) =>
    q
      .from({ listing: listingsCollection })
      .orderBy(({ listing }: any) => (listing.title ?? "") as string, "asc"),
  );

  return (
    <div>
      <div data-testid="lists-count">{allLists.length}</div>
      <div data-testid="listings-count">{allListings.length}</div>
      <div data-testid="membership">
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
    </div>
  );
}

function ImagesViewer({
  imagesCollection,
  listingId,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imagesCollection: any;
  listingId: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items = [] } = useLiveQuery((q: any) =>
    q
      .from({ img: imagesCollection })
      .orderBy(({ img }: any) => (img.order ?? 0) as number, "asc"),
  );

  const rows = items.filter((i: any) => i.listingId === listingId);

  return (
    <div>
      <div data-testid="count">{rows.length}</div>
      <div data-testid="urls">{rows.map((i: any) => i.url).join(",")}</div>
      <div data-testid="orders">{rows.map((i: any) => i.order).join(",")}</div>
    </div>
  );
}

describe("dashboardDb TanStack DB collections", () => {
  it("listings: insert -> update -> delete live updates", async () => {
    await withTempAppDb(async () => {
      const {
        listingsCollection,
        insertListing,
        updateListing,
        deleteListing,
        initializeListingsCollection,
      } = await import("@/app/dashboard/_lib/dashboard-db/listings-collection");

      await act(async () => {
        await initializeListingsCollection("test-user");
        render(<ListingsViewer listingsCollection={listingsCollection} />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("0");
      });

      let createdId = "";
      await act(async () => {
        const created = await insertListing({ title: "Hello" });
        createdId = created.id;
      });

      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("1");
        expect(screen.getByTestId("titles").textContent).toBe("Hello");
      });

      await act(async () => {
        await updateListing({ id: createdId, data: { title: "Hello Updated" } });
      });

      await waitFor(() => {
        expect(screen.getByTestId("titles").textContent).toBe("Hello Updated");
      });

      await act(async () => {
        await deleteListing({ id: createdId });
      });

      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("0");
      });
    });
  });

  it("lists: add/remove membership updates live derived view", async () => {
    await withTempAppDb(async () => {
      const {
        listsCollection,
        insertList,
        addListingToList,
        removeListingFromList,
        initializeListsCollection,
      } = await import("@/app/dashboard/_lib/dashboard-db/lists-collection");

      const { listingsCollection, insertListing, initializeListingsCollection } =
        await import("@/app/dashboard/_lib/dashboard-db/listings-collection");

      await act(async () => {
        await initializeListsCollection("test-user");
        await initializeListingsCollection("test-user");
        render(
          <MembershipViewer
            listsCollection={listsCollection}
            listingsCollection={listingsCollection}
          />,
        );
      });

      let listId = "";
      let listingId = "";
      await act(async () => {
        const list = await insertList({ title: "L1" });
        const listing = await insertListing({ title: "A" });
        listId = list.id;
        listingId = listing.id;
      });

      await waitFor(() => {
        expect(screen.getByTestId("lists-count").textContent).toBe("1");
        expect(screen.getByTestId("listings-count").textContent).toBe("1");
      });

      await act(async () => {
        await addListingToList({ listId, listingId });
      });

      await waitFor(() => {
        expect(screen.getByTestId("membership").textContent).toContain("L1:A");
      });

      await act(async () => {
        await removeListingFromList({ listId, listingId });
      });

      await waitFor(() => {
        expect(screen.getByTestId("membership").textContent).toBe("L1:");
      });
    });
  });

  it("images: create -> reorder -> delete renumbers", async () => {
    await withTempAppDb(async () => {
      const { insertListing, initializeListingsCollection } = await import(
        "@/app/dashboard/_lib/dashboard-db/listings-collection"
      );
      const {
        imagesCollection,
        createImage,
        reorderImages,
        deleteImage,
        initializeImagesCollection,
      } = await import("@/app/dashboard/_lib/dashboard-db/images-collection");

      await act(async () => {
        await initializeListingsCollection("test-user");
        await initializeImagesCollection("test-user");
      });

      let listingId = "";
      await act(async () => {
        const listing = await insertListing({ title: "WithImages" });
        listingId = listing.id;
      });

      await act(async () => {
        render(
          <ImagesViewer imagesCollection={imagesCollection} listingId={listingId} />,
        );
      });

      let u1Id = "";
      let u2Id = "";
      await act(async () => {
        const u1 = await createImage({
          type: "listing",
          referenceId: listingId,
          url: "u1",
          key: "k1",
        });
        const u2 = await createImage({
          type: "listing",
          referenceId: listingId,
          url: "u2",
          key: "k2",
        });
        u1Id = u1.id;
        u2Id = u2.id;
      });

      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("2");
        expect(screen.getByTestId("urls").textContent).toBe("u1,u2");
        expect(screen.getByTestId("orders").textContent).toBe("0,1");
      });

      await act(async () => {
        await reorderImages({
          type: "listing",
          referenceId: listingId,
          images: [
            { id: u2Id, order: 0 },
            { id: u1Id, order: 1 },
          ],
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId("urls").textContent).toBe("u2,u1");
        expect(screen.getByTestId("orders").textContent).toBe("0,1");
      });

      await act(async () => {
        await deleteImage({
          type: "listing",
          referenceId: listingId,
          imageId: u2Id,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("1");
        expect(screen.getByTestId("urls").textContent).toBe("u1");
        expect(screen.getByTestId("orders").textContent).toBe("0");
      });
    });
  });
});
