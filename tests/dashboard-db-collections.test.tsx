import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useLiveQuery } from "@tanstack/react-db";
import { createTRPCProxyClient, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { AppRouter } from "@/server/api/root";
import { callerLink, withTempAppDb } from "@/lib/test-utils/app-test-db";

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

function CultivarJoinViewer({
  listingsCollection,
  cultivarReferencesCollection,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listingsCollection: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cultivarReferencesCollection: any;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listings = [] } = useLiveQuery((q: any) =>
    q
      .from({ listing: listingsCollection })
      .orderBy(({ listing }: any) => (listing.title ?? "") as string, "asc"),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cultivarRefs = [] } = useLiveQuery((q: any) =>
    q
      .from({ ref: cultivarReferencesCollection })
      .orderBy(({ ref }: any) => ref.updatedAt as Date, "asc"),
  );

  const refById = new Map(cultivarRefs.map((r: any) => [r.id, r]));

  const joined = listings
    .map((l: any) => {
      const ref = l.cultivarReferenceId
        ? refById.get(l.cultivarReferenceId)
        : null;
      const name = ref?.ahsListing?.name ?? "";
      return `${l.title}:${name}`;
    })
    .join(",");

  return <div data-testid="joined">{joined}</div>;
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

function ListTitlesViewer({
  listsCollection,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listsCollection: any;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items = [] } = useLiveQuery((q: any) =>
    q
      .from({ list: listsCollection })
      .orderBy(({ list }: any) => (list.title ?? "") as string, "asc"),
  );

  return (
    <div data-testid="list-titles">
      {items
        .map((l: any) => (typeof l.title === "string" ? l.title : "__INVALID__"))
        .join(",")}
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
  it("listings: cursor does not skip writes that happen during a sync window", async () => {
    await withTempAppDb(async ({ user }) => {
      const { db } = await import("@/server/db");

      await db.listing.create({
        data: {
          userId: user.id,
          title: "A",
          slug: `a-${crypto.randomUUID()}`,
        },
      });

      let didInsertDuringSync = false;
      let syncCallCount = 0;
      const { createCaller } = await import("@/server/api/root");
      const caller = createCaller(async () => {
        return {
          db,
          headers: new Headers(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          user: { id: user.id } as any,
        };
      });

      const insertDuringSyncLink: TRPCLink<AppRouter> = () => {
        return ({ op, next }) =>
          observable((emit) => {
            let pending = Promise.resolve();

            const sub = next(op).subscribe({
              next: (value) => {
                pending = pending.then(async () => {
                  if (op.path === "dashboardDb.listing.sync") {
                    syncCallCount++;

                    if (!didInsertDuringSync) {
                      didInsertDuringSync = true;

                      await db.listing.create({
                        data: {
                          userId: user.id,
                          title: "B",
                          slug: `b-${crypto.randomUUID()}`,
                        },
                      });

                      // Ensure the client advances its cursor *after* this write's updatedAt.
                      await new Promise((r) => setTimeout(r, 10));
                    }
                  }

                  emit.next(value);
                });
              },
              error: (err) => emit.error(err),
              complete: () => {
                void pending.then(() => emit.complete());
              },
            });

            return () => sub.unsubscribe();
          });
      };

      const clientLike = createTRPCProxyClient<AppRouter>({
        links: [insertDuringSyncLink, callerLink(caller)],
      });

      const { setTestTrpcClient } = await import("@/trpc/client");
      setTestTrpcClient(clientLike);

      const {
        listingsCollection,
        initializeListingsCollection,
      } = await import("@/app/dashboard/_lib/dashboard-db/listings-collection");

      await act(async () => {
        await initializeListingsCollection(user.id);
        render(<ListingsViewer listingsCollection={listingsCollection} />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("1");
        expect(screen.getByTestId("titles").textContent).toBe("A");
      });

      const { getQueryClient } = await import("@/trpc/query-client");
      const qc = getQueryClient();
      const q = qc.getQueryCache().find({
        queryKey: ["dashboard-db", "listings"],
      });
      expect(q).toBeTruthy();
      expect(q?.getObserversCount()).toBeGreaterThan(0);
      expect(q?.isDisabled()).toBe(false);

      // The first sync inserts B *after* the server read snapshot.
      // A correct cursor should still allow a later sync to pick it up.
      await act(async () => {
        await listingsCollection.utils.refetch();
      });

      expect(syncCallCount).toBeGreaterThan(0);

      const titlesInDb = (
        await db.listing.findMany({
          where: { userId: user.id },
          select: { title: true },
          orderBy: { title: "asc" },
        })
      ).map((r) => r.title);
      expect(titlesInDb).toEqual(["A", "B"]);

      await act(async () => {
        await listingsCollection.utils.refetch();
      });

      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("2");
        expect(screen.getByTestId("titles").textContent).toBe("A,B");
      });
    });
  });

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

  it("lists: update ignores undefined fields (no optimistic wipe)", async () => {
    await withTempAppDb(async ({ user }) => {
      const { db } = await import("@/server/db");
      const { createCaller } = await import("@/server/api/root");
      const caller = createCaller(async () => {
        return {
          db,
          headers: new Headers(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          user: { id: user.id } as any,
        };
      });

      let releaseUpdate: (() => void) | undefined;
      const updateGate = new Promise<void>((resolve) => {
        releaseUpdate = () => resolve();
      });

      const delayUpdateLink: TRPCLink<AppRouter> = () => {
        return ({ op, next }) =>
          observable((emit) => {
            let pending = Promise.resolve();

            const sub = next(op).subscribe({
              next: (value) => {
                pending = pending.then(async () => {
                  if (op.path === "dashboardDb.list.update") {
                    await updateGate;
                  }

                  emit.next(value);
                });
              },
              error: (err) => emit.error(err),
              complete: () => {
                void pending.then(() => emit.complete());
              },
            });

            return () => sub.unsubscribe();
          });
      };

      const clientLike = createTRPCProxyClient<AppRouter>({
        links: [delayUpdateLink, callerLink(caller)],
      });

      const { setTestTrpcClient } = await import("@/trpc/client");
      setTestTrpcClient(clientLike);

      const { listsCollection, updateList, initializeListsCollection } =
        await import("@/app/dashboard/_lib/dashboard-db/lists-collection");

      const seeded = await db.list.create({
        data: { userId: user.id, title: "Alpha" },
        select: { id: true },
      });
      expect(
        await db.list.findUnique({
          where: { id: seeded.id },
          select: { id: true, userId: true },
        }),
      ).toMatchObject({ id: seeded.id, userId: user.id });
      expect(await caller.dashboardDb.list.get({ id: seeded.id })).toMatchObject({
        id: seeded.id,
      });

      await act(async () => {
        await initializeListsCollection(user.id);
        render(<ListTitlesViewer listsCollection={listsCollection} />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("list-titles").textContent).toBe("Alpha");
      });

      let updatePromise: Promise<void> | null = null;
      try {
        await act(async () => {
          updatePromise = updateList({
            id: seeded.id,
            data: {
              title: undefined,
              description: "Updated description",
            },
          });
        });

        await waitFor(() => {
          expect(screen.getByTestId("list-titles").textContent).toBe("Alpha");
        });
      } finally {
        releaseUpdate?.();
        if (updatePromise) {
          await act(async () => {
            await updatePromise;
          });
        }
      }

      await waitFor(() => {
        expect(screen.getByTestId("list-titles").textContent).toBe("Alpha");
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

  it("cultivar refs: linking updates live joined AHS fields", async () => {
    await withTempAppDb(async () => {
      const { db } = await import("@/server/db");

      const ahs = await db.ahsListing.create({
        data: { name: "AHS-Alpha" },
      });
      const cultivarRef = await db.cultivarReference.create({
        data: {
          ahsId: ahs.id,
          normalizedName: "ahs-alpha",
        },
      });

      const {
        listingsCollection,
        insertListing,
        linkAhs,
        initializeListingsCollection,
      } = await import("@/app/dashboard/_lib/dashboard-db/listings-collection");
      const {
        cultivarReferencesCollection,
        initializeCultivarReferencesCollection,
      } = await import(
        "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection"
      );

      await act(async () => {
        await initializeListingsCollection("test-user");
        await initializeCultivarReferencesCollection("test-user");
        render(
          <CultivarJoinViewer
            listingsCollection={listingsCollection}
            cultivarReferencesCollection={cultivarReferencesCollection}
          />,
        );
      });

      let listingId = "";
      await act(async () => {
        const created = await insertListing({ title: "L1" });
        listingId = created.id;
      });

      await waitFor(() => {
        expect(screen.getByTestId("joined").textContent).toBe("L1:");
      });

      await act(async () => {
        await linkAhs({
          id: listingId,
          cultivarReferenceId: cultivarRef.id,
          syncName: false,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId("joined").textContent).toBe("L1:AHS-Alpha");
      });
    });
  });
});
