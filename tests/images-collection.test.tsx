import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";
const { useLiveQuery } = await import("@tanstack/react-db");

beforeEach(() => {
  localStorage.clear();
});

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
function ImagesViewer({
  imagesCollection,
  listingId,
}: {
  imagesCollection: any;
  listingId: string;
}) {
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
      <div data-testid="ids">{rows.map((i: any) => i.id).join(",")}</div>
      <div data-testid="orders">{rows.map((i: any) => i.order).join(",")}</div>
    </div>
  );
}

function ListingsInitViewer({
  listingsCollection,
}: {
  listingsCollection: any;
}) {
  useLiveQuery((q: any) => q.from({ listing: listingsCollection }));
  return <div />;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

describe("imagesCollection: create → reorder → delete", () => {
  it("handles optimistic flow and live rendering for a listing", async () => {
    await withTempAppDb(async () => {
      const {
        imagesCollection,
        createImage,
        reorderImages,
        deleteImage,
        initializeImagesCollection,
      } = await import("@/app/dashboard-two/_lib/images-collection");
      const {
        insertListing,
        initializeListingsCollection,
        listingsCollection,
      } = await import("@/app/dashboard-two/_lib/listings-collection");
      const { getTrpcClient } = await import("@/trpc/client");
      const client = getTrpcClient();

      // Prepare collections
      await act(async () => {
        await initializeListingsCollection();
        await initializeImagesCollection();
      });

      // Mount a listings live query to initialize manual sync context
      await act(async () => {
        render(<ListingsInitViewer listingsCollection={listingsCollection} />);
      });

      // Create a listing
      await act(async () => {
        await insertListing({ title: "WithImages" });
      });
      const allListings = await client.dashboardTwo.syncListings.query({
        since: null,
      });
      const listing = allListings.find((x) => x.title === "WithImages");
      expect(listing).toBeTruthy();
      const listingId = listing!.id;

      // Render viewer scoped to this listing
      await act(async () => {
        render(
          <ImagesViewer
            imagesCollection={imagesCollection}
            listingId={listingId}
          />,
        );
      });

      // Starts empty
      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("0");
        expect(screen.getByTestId("urls").textContent).toBe("");
      });

      // Add two images
      let created1: any;
      let created2: any;
      await act(async () => {
        created1 = await createImage({ listingId, url: "u1" });
        created2 = await createImage({ listingId, url: "u2" });
      });

      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("2");
        expect(screen.getByTestId("urls").textContent).toBe("u1,u2");
        expect(screen.getByTestId("orders").textContent).toBe("0,1");
      });

      // Reorder: put u2 first
      await act(async () => {
        await reorderImages({
          listingId,
          images: [
            { id: created2.id as string, order: 0 },
            { id: created1.id as string, order: 1 },
          ],
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId("urls").textContent).toBe("u2,u1");
        expect(screen.getByTestId("orders").textContent).toBe("0,1");
      });

      // Delete first image (u2)
      await act(async () => {
        await deleteImage({ id: created2.id as string });
      });

      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("1");
        expect(screen.getByTestId("urls").textContent).toBe("u1");
      });
    });
  });

  it("renumbers after delete, then add assigns next order", async () => {
    await withTempAppDb(async () => {
      const {
        imagesCollection,
        createImage,
        deleteImage,
        initializeImagesCollection,
      } = await import("@/app/dashboard-two/_lib/images-collection");
      const {
        insertListing,
        initializeListingsCollection,
        listingsCollection,
      } = await import("@/app/dashboard-two/_lib/listings-collection");
      const { getTrpcClient } = await import("@/trpc/client");
      const client = getTrpcClient();

      // Init collections and mount a listings query to ready manual sync
      await act(async () => {
        await initializeListingsCollection();
        await initializeImagesCollection();
        render(<ListingsInitViewer listingsCollection={listingsCollection} />);
      });

      // Create listing
      await act(async () => {
        await insertListing({ title: "OrderCase" });
      });
      const allListings2 = await client.dashboardTwo.syncListings.query({
        since: null,
      });
      const listing2 = allListings2.find((x) => x.title === "OrderCase");
      expect(listing2).toBeTruthy();
      const listingId = listing2!.id;

      await act(async () => {
        render(
          <ImagesViewer
            imagesCollection={imagesCollection}
            listingId={listingId}
          />,
        );
      });

      // Add u1, u2
      let u1: any;
      let u2: any;
      await act(async () => {
        u1 = await createImage({ listingId, url: "u1" });
        u2 = await createImage({ listingId, url: "u2" });
      });
      await waitFor(() => {
        expect(screen.getByTestId("orders").textContent).toBe("0,1");
      });

      // Delete the first (u1)
      await act(async () => {
        await deleteImage({ id: u1.id as string });
      });
      await waitFor(() => {
        // Orders should renumber to 0
        expect(screen.getByTestId("orders").textContent).toBe("0");
        expect(screen.getByTestId("urls").textContent).toBe("u2");
      });

      // Add u3; should take next order 1
      await act(async () => {
        await createImage({ listingId, url: "u3" });
      });
      await waitFor(() => {
        expect(screen.getByTestId("urls").textContent).toBe("u2,u3");
        expect(screen.getByTestId("orders").textContent).toBe("0,1");
      });
    });
  });
});
