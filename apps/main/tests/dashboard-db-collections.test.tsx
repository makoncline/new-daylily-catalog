import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useLiveQuery } from "@tanstack/react-db";
import { createTRPCProxyClient, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { AppRouter } from "@/server/api/root";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { callerLink, withTempAppDb } from "@/lib/test-utils/app-test-db";

vi.mock("@/server/services/legacy-image-storage", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/server/services/legacy-image-storage")
    >();
  return {
    ...actual,
    getLegacyS3Client: () => ({
      send: async (command: { input: { Bucket: string; Key: string } }) => {
        expect(command.input.Bucket).toBe("daylily-catalog-images-test");
        expect(command.input.Key).toMatch(/\/u[12]\.jpg$/);
        return { ContentLength: 4, ContentType: "image/jpeg" };
      },
    }),
  };
});

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
  const { data: allListsData = [] } = useLiveQuery((q: any) =>
    q
      .from({ list: listsCollection })
      .orderBy(({ list }: any) => (list.title ?? "") as string, "asc"),
  );
  const allLists = allListsData as any[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allListingsData = [] } = useLiveQuery((q: any) =>
    q
      .from({ listing: listingsCollection })
      .orderBy(({ listing }: any) => (listing.title ?? "") as string, "asc"),
  );
  const allListings = allListingsData as any[];

  return (
    <div>
      <div data-testid="lists-count">{allLists.length}</div>
      <div data-testid="listings-count">{allListings.length}</div>
      <div data-testid="membership">
        {allLists
          .map((l: any) => {
            const titles = (l.listings ?? [])
              .flatMap(({ id }: any) => {
                const title = allListings.find((x: any) => x.id === id)?.title;
                return title ? [title] : [];
              })
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
        .map((l: any) =>
          typeof l.title === "string" ? l.title : "__INVALID__",
        )
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

function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

function holdSyncResults(paths: string[]) {
  const held = gate();
  const read = gate();
  const delivered = gate();
  const remaining = new Set(paths);
  let pendingDeliveries = paths.length;
  const completed: string[] = [];
  const link: TRPCLink<AppRouter> =
    () =>
    ({ op, next }) =>
      observable((emit) => {
        let pending = Promise.resolve();
        const sub = next(op).subscribe({
          next(value) {
            pending = pending.then(async () => {
              if (remaining.delete(op.path)) {
                if (remaining.size === 0) read.release();
                await held.promise;
                emit.next(value);
                pendingDeliveries -= 1;
                if (pendingDeliveries === 0) delivered.release();
              } else emit.next(value);
            });
          },
          error: (error) => emit.error(error),
          complete: () => {
            void pending.then(() => {
              emit.complete();
              completed.push(op.path);
            });
          },
        });
        return () => sub.unsubscribe();
      });
  return {
    link,
    read: read.promise,
    delivered: delivered.promise,
    completed,
    release: held.release,
  };
}

function holdUpdateRequest() {
  const held = gate();
  const started = gate();
  const link: TRPCLink<AppRouter> =
    () =>
    ({ op, next }) =>
      observable((emit) => {
        let sub: ReturnType<ReturnType<typeof next>["subscribe"]> | undefined;
        let stopped = false;
        void (async () => {
          if (op.path === "dashboardDb.listing.update") {
            started.release();
            await held.promise;
          }
          if (!stopped) sub = next(op).subscribe(emit);
        })();
        return () => {
          stopped = true;
          sub?.unsubscribe();
        };
      });
  return { link, started: started.promise, release: held.release };
}

describe("dashboardDb TanStack DB collections", () => {
  it.each(["before", "during"])(
    "focus sync started %s a save cannot replace the saved listing",
    async (timing) => {
      await withTempAppDb(async ({ user }) => {
        const { db } = await import("@/server/db");
        const seeded = await db.listing.create({
          data: { userId: user.id, title: "Old title", slug: "old-title" },
        });
        if (timing === "before") {
          await db.listing.createMany({
            data: Array.from({ length: 100 }, (_, index) => ({
              userId: user.id,
              title: `Other bloom ${index}`,
              slug: `other-bloom-${index}`,
            })),
          });
        }
        const { createCaller } = await import("@/server/api/root");
        const caller = createCaller({
          db,
          replicaDb: db,
          hasReplicaDb: true,
          headers: new Headers(),
          _authUser: { id: user.id } as TRPCInternalContext["_authUser"],
          _confirmedActiveMembership: true,
        });
        const { bootstrapDashboardDbFromServer } = await import(
          "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence"
        );
        await bootstrapDashboardDbFromServer(user.id);
        const {
          listingsCollection,
          clearNextListingsCollectionSyncSuppression,
          updateListing,
        } = await import(
          "@/app/dashboard/_lib/dashboard-db/listings-collection"
        );
        const subscription = listingsCollection.subscribeChanges(
          () => undefined,
        );
        const sync = holdSyncResults(["dashboardDb.listing.sync"]);
        const update = holdUpdateRequest();
        const { setTestTrpcClient } = await import("@/trpc/client");
        setTestTrpcClient(
          createTRPCProxyClient<AppRouter>({
            links: [sync.link, update.link, callerLink(caller)],
          }),
        );
        const { getQueryClient } = await import("@/trpc/query-client");
        const { focusManager } = await import("@tanstack/react-query");
        const queryClient = getQueryClient();
        const queryKey = ["dashboard-db", "listings"];
        const { getUserCursorKey } = await import("@/lib/utils/cursor");
        const cursorKey = getUserCursorKey(
          "dashboard-db:listings:maxUpdatedAt",
        );
        clearNextListingsCollectionSyncSuppression();
        localStorage.removeItem(cursorKey);
        queryClient.mount();
        const save = () =>
          updateListing({
            id: seeded.id,
            expectedUpdatedAt: seeded.updatedAt.toISOString(),
            data: { title: "New title" },
          });
        let saving: ReturnType<typeof save> | undefined;
        try {
          if (timing === "during") {
            saving = save();
            await update.started;
          }
          await queryClient.invalidateQueries({
            queryKey,
            refetchType: "none",
          });
          focusManager.setFocused(false);
          focusManager.setFocused(true);
          await sync.read;
          saving ??= save();
          update.release();
          const saved = await saving;
          expect(saved.title).toBe("New title");
          expect(listingsCollection.get(seeded.id)?.title).toBe("New title");
          sync.release();
          await sync.delivered;
          await waitFor(() =>
            expect(
              sync.completed.filter(
                (path) => path === "dashboardDb.listing.sync",
              ),
            ).toHaveLength(timing === "before" ? 2 : 1),
          );
          await waitFor(() =>
            expect(queryClient.isFetching({ queryKey })).toBe(0),
          );
          expect(
            (await db.listing.findUniqueOrThrow({ where: { id: seeded.id } }))
              .title,
          ).toBe("New title");
          expect(listingsCollection.get(seeded.id)?.title).toBe("New title");
          expect(localStorage.getItem(cursorKey)).toBeNull();
          focusManager.setFocused(false);
          focusManager.setFocused(true);
          await waitFor(() =>
            expect(queryClient.isFetching({ queryKey })).toBe(1),
          );
          await queryClient.getQueryCache().find({ queryKey })?.promise;
          expect(localStorage.getItem(cursorKey)).toBe(
            saved.updatedAt.toISOString(),
          );
          expect(listingsCollection.get(seeded.id)?.title).toBe("New title");
        } finally {
          sync.release();
          update.release();
          await saving;
          queryClient.unmount();
          focusManager.setFocused(undefined);
          subscription.unsubscribe();
          await listingsCollection.cleanup();
        }
      });
    },
  );

  it("held focus sync cannot replace newer list, image, or cultivar-reference state", async () => {
    await withTempAppDb(async ({ user }) => {
      const { db } = await import("@/server/db");
      const listing = await db.listing.create({
        data: { userId: user.id, title: "Linked bloom", slug: "linked-bloom" },
      });
      const list = await db.list.create({
        data: { userId: user.id, title: "Old list" },
      });
      const firstImage = await db.image.create({
        data: { listingId: listing.id, url: "/first.jpg", order: 0 },
      });
      const secondImage = await db.image.create({
        data: { listingId: listing.id, url: "/second.jpg", order: 1 },
      });
      const cultivar = await db.v2AhsCultivar.create({
        data: {
          id: "sync-cultivar",
          post_title: "Linked cultivar",
          link_normalized_name: "linked-cultivar",
        },
      });
      const reference = await db.cultivarReference.create({
        data: {
          v2AhsCultivarId: cultivar.id,
          normalizedName: "linked-cultivar",
        },
      });
      const { bootstrapDashboardDbFromServer } = await import(
        "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence"
      );
      await bootstrapDashboardDbFromServer(user.id);
      const listings = await import(
        "@/app/dashboard/_lib/dashboard-db/listings-collection"
      );
      const lists = await import(
        "@/app/dashboard/_lib/dashboard-db/lists-collection"
      );
      const images = await import(
        "@/app/dashboard/_lib/dashboard-db/images-collection"
      );
      const references = await import(
        "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection"
      );
      const collections = [
        listings.listingsCollection,
        lists.listsCollection,
        images.imagesCollection,
        references.cultivarReferencesCollection,
      ];
      const subscriptions = collections.map((collection) =>
        collection.subscribeChanges(() => undefined),
      );
      listings.clearNextListingsCollectionSyncSuppression();
      lists.clearNextListsCollectionSyncSuppression();
      images.clearNextImagesCollectionSyncSuppression();
      references.clearNextCultivarReferencesCollectionSyncSuppression();
      const sync = holdSyncResults([
        "dashboardDb.listing.sync",
        "dashboardDb.list.sync",
        "dashboardDb.image.sync",
        "dashboardDb.cultivarReference.sync",
      ]);
      const { createCaller } = await import("@/server/api/root");
      const caller = createCaller({
        db,
        replicaDb: db,
        hasReplicaDb: true,
        headers: new Headers(),
        _authUser: { id: user.id } as TRPCInternalContext["_authUser"],
        _confirmedActiveMembership: true,
      });
      const { setTestTrpcClient } = await import("@/trpc/client");
      setTestTrpcClient(
        createTRPCProxyClient<AppRouter>({
          links: [sync.link, callerLink(caller)],
        }),
      );
      const { getQueryClient } = await import("@/trpc/query-client");
      const { focusManager } = await import("@tanstack/react-query");
      const queryClient = getQueryClient();
      queryClient.mount();
      try {
        await queryClient.invalidateQueries({
          queryKey: ["dashboard-db"],
          refetchType: "none",
        });
        focusManager.setFocused(false);
        focusManager.setFocused(true);
        await sync.read;
        const created = await listings.insertListing({
          title: "Created bloom",
        });
        await lists.updateList({
          id: list.id,
          expectedUpdatedAt: list.updatedAt.toISOString(),
          data: { title: "Saved list" },
        });
        await images.reorderImages({
          type: "listing",
          referenceId: listing.id,
          images: [
            { id: secondImage.id, order: 0 },
            { id: firstImage.id, order: 1 },
          ],
        });
        await listings.linkAhs({
          id: listing.id,
          cultivarReferenceId: reference.id,
        });
        sync.release();
        await sync.delivered;
        await waitFor(() =>
          expect(queryClient.isFetching({ queryKey: ["dashboard-db"] })).toBe(
            0,
          ),
        );
        expect(listings.listingsCollection.get(created.id)?.title).toBe(
          "Created bloom",
        );
        expect(lists.listsCollection.get(list.id)?.title).toBe("Saved list");
        expect(images.imagesCollection.get(firstImage.id)?.order).toBe(1);
        expect(images.imagesCollection.get(secondImage.id)?.order).toBe(0);
        expect(
          references.cultivarReferencesCollection.get(reference.id)?.ahsListing
            ?.name,
        ).toBe("Linked cultivar");
        expect(
          listings.listingsCollection.get(listing.id)?.cultivarReferenceId,
        ).toBe(reference.id);
        expect(
          (await db.listing.findUniqueOrThrow({ where: { id: created.id } }))
            .title,
        ).toBe("Created bloom");
        expect(
          (await db.list.findUniqueOrThrow({ where: { id: list.id } })).title,
        ).toBe("Saved list");
        expect(
          await db.image.findMany({
            where: { listingId: listing.id },
            orderBy: { order: "asc" },
            select: { id: true, order: true },
          }),
        ).toEqual([
          { id: secondImage.id, order: 0 },
          { id: firstImage.id, order: 1 },
        ]);
        expect(
          (await db.listing.findUniqueOrThrow({ where: { id: listing.id } }))
            .cultivarReferenceId,
        ).toBe(reference.id);
      } finally {
        sync.release();
        queryClient.unmount();
        focusManager.setFocused(undefined);
        subscriptions.forEach((subscription) => subscription.unsubscribe());
        await Promise.all(
          collections.map((collection) => collection.cleanup()),
        );
      }
    });
  });

  it("failed save rolls back and canceled focus sync recovers on the next focus", async () => {
    await withTempAppDb(async ({ user }) => {
      const { db } = await import("@/server/db");
      const seeded = await db.listing.create({
        data: {
          userId: user.id,
          title: "Original title",
          slug: "original-title",
        },
      });
      const { bootstrapDashboardDbFromServer } = await import(
        "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence"
      );
      await bootstrapDashboardDbFromServer(user.id);
      const {
        listingsCollection,
        clearNextListingsCollectionSyncSuppression,
        updateListing,
      } = await import("@/app/dashboard/_lib/dashboard-db/listings-collection");
      const subscription = listingsCollection.subscribeChanges(() => undefined);
      const current = await db.listing.update({
        where: { id: seeded.id },
        data: {
          title: "Other saved title",
          updatedAt: new Date(seeded.updatedAt.getTime() + 1000),
        },
      });
      const { createCaller } = await import("@/server/api/root");
      const caller = createCaller({
        db,
        replicaDb: db,
        hasReplicaDb: true,
        headers: new Headers(),
        _authUser: { id: user.id } as TRPCInternalContext["_authUser"],
        _confirmedActiveMembership: true,
      });
      const sync = holdSyncResults(["dashboardDb.listing.sync"]);
      const update = holdUpdateRequest();
      const { setTestTrpcClient } = await import("@/trpc/client");
      setTestTrpcClient(
        createTRPCProxyClient<AppRouter>({
          links: [sync.link, update.link, callerLink(caller)],
        }),
      );
      const { getQueryClient } = await import("@/trpc/query-client");
      const { focusManager } = await import("@tanstack/react-query");
      const queryClient = getQueryClient();
      const queryKey = ["dashboard-db", "listings"];
      clearNextListingsCollectionSyncSuppression();
      queryClient.mount();
      const saving = updateListing({
        id: seeded.id,
        expectedUpdatedAt: seeded.updatedAt.toISOString(),
        data: { title: "Rejected draft" },
      }).then(
        () => null,
        (error: unknown) => error,
      );
      try {
        await update.started;
        expect(listingsCollection.get(seeded.id)?.title).toBe("Rejected draft");
        await queryClient.invalidateQueries({ queryKey, refetchType: "none" });
        focusManager.setFocused(false);
        focusManager.setFocused(true);
        await sync.read;
        update.release();
        expect(await saving).toMatchObject({
          message:
            "The listing changed. Load the latest version before saving.",
        });
        expect(listingsCollection.get(seeded.id)?.title).toBe("Original title");
        sync.release();
        await sync.delivered;
        await waitFor(() =>
          expect(queryClient.isFetching({ queryKey })).toBe(0),
        );
        expect(listingsCollection.get(seeded.id)?.title).toBe("Original title");
        expect(
          (await db.listing.findUniqueOrThrow({ where: { id: seeded.id } }))
            .title,
        ).toBe(current.title);
        focusManager.setFocused(false);
        focusManager.setFocused(true);
        await waitFor(() =>
          expect(listingsCollection.get(seeded.id)?.title).toBe(current.title),
        );
      } finally {
        sync.release();
        update.release();
        await saving;
        queryClient.unmount();
        focusManager.setFocused(undefined);
        subscription.unsubscribe();
        await listingsCollection.cleanup();
      }
    });
  });

  it("incremental sync does not limit rows to one page", async () => {
    const { fetchDashboardSyncPages } = await import(
      "@/app/dashboard/_lib/dashboard-db/collection-bootstrap"
    );

    const calls: unknown[] = [];
    const rows = await fetchDashboardSyncPages({
      since: "2026-01-01T00:00:00.000Z",
      pageSize: 1,
      fetchPage: async (input) => {
        calls.push(input);
        return [{ id: "listing-1" }, { id: "listing-2" }];
      },
    });

    expect(rows.map((row) => row.id)).toEqual(["listing-1", "listing-2"]);
    expect(calls).toEqual([
      {
        since: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  it("listings: cursor does not skip writes that happen during a sync window", async () => {
    await withTempAppDb(async ({ user }) => {
      const { bootstrapDashboardDbFromServer } = await import(
        "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence"
      );
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
          _authUser: {
            id: user.id,
          } as unknown as TRPCInternalContext["_authUser"],
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

      const { listingsCollection } = await import(
        "@/app/dashboard/_lib/dashboard-db/listings-collection"
      );

      await act(async () => {
        await bootstrapDashboardDbFromServer(user.id);
        await listingsCollection.utils.refetch();
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

      setTestTrpcClient(clientLike);

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

  it("listings: pending delete stays deleted across full refresh", async () => {
    await withTempAppDb(async ({ user }) => {
      const { bootstrapDashboardDbFromServer, refreshDashboardDbFromServer } =
        await import(
          "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence"
        );
      const { db } = await import("@/server/db");

      const seeded = await db.listing.create({
        data: {
          userId: user.id,
          title: "Alpha",
          slug: `alpha-${crypto.randomUUID()}`,
        },
        select: { id: true },
      });

      const { createCaller } = await import("@/server/api/root");
      const caller = createCaller(async () => {
        return {
          db,
          headers: new Headers(),
          _authUser: {
            id: user.id,
          } as unknown as TRPCInternalContext["_authUser"],
        };
      });

      let releaseDelete: (() => void) | undefined;
      const deleteGate = new Promise<void>((resolve) => {
        releaseDelete = () => resolve();
      });

      let captureRefresh = false;
      let resolveRefreshSnapshot!: () => void;
      const refreshSnapshot = new Promise<void>((resolve) => {
        resolveRefreshSnapshot = resolve;
      });

      const delayDeleteLink: TRPCLink<AppRouter> = () => {
        return ({ op, next }) =>
          observable((emit) => {
            let sub:
              | ReturnType<ReturnType<typeof next>["subscribe"]>
              | undefined;
            let cancelled = false;

            void (async () => {
              if (op.path === "dashboardDb.listing.delete") {
                await deleteGate;
              }

              if (cancelled) {
                return;
              }

              sub = next(op).subscribe({
                next: (value) => {
                  emit.next(value);
                  if (
                    captureRefresh &&
                    op.path === "dashboardDb.bootstrap.roots"
                  ) {
                    resolveRefreshSnapshot();
                  }
                },
                error: (err) => emit.error(err),
                complete: () => emit.complete(),
              });
            })();

            return () => {
              cancelled = true;
              sub?.unsubscribe();
            };
          });
      };

      const clientLike = createTRPCProxyClient<AppRouter>({
        links: [delayDeleteLink, callerLink(caller)],
      });

      const { setTestTrpcClient } = await import("@/trpc/client");
      setTestTrpcClient(clientLike);

      const { listingsCollection, deleteListing } = await import(
        "@/app/dashboard/_lib/dashboard-db/listings-collection"
      );

      await act(async () => {
        await bootstrapDashboardDbFromServer(user.id);
        render(<ListingsViewer listingsCollection={listingsCollection} />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("1");
        expect(screen.getByTestId("titles").textContent).toBe("Alpha");
      });

      let deletePromise: Promise<void> | null = null;
      act(() => {
        deletePromise = deleteListing({ id: seeded.id });
      });

      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("0");
        expect(screen.getByTestId("titles").textContent).toBe("");
      });

      captureRefresh = true;
      const refreshPromise = refreshDashboardDbFromServer(user.id);

      await act(async () => {
        await refreshSnapshot;
      });

      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("0");
        expect(screen.getByTestId("titles").textContent).toBe("");
      });

      releaseDelete?.();

      if (deletePromise) {
        await act(async () => {
          await Promise.all([deletePromise, refreshPromise]);
        });
      }

      expect(await refreshPromise).toBe(false);

      await act(async () => {
        await listingsCollection.utils.refetch();
      });

      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("0");
        expect(screen.getByTestId("titles").textContent).toBe("");
      });
    });
  });

  it("listings: full refresh rejects a snapshot read during an optimistic update", async () => {
    await withTempAppDb(async ({ user }) => {
      const { bootstrapDashboardDbFromServer, refreshDashboardDbFromServer } =
        await import(
          "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence"
        );
      const { db } = await import("@/server/db");

      const seeded = await db.listing.create({
        data: {
          userId: user.id,
          title: "Alpha",
          slug: `alpha-${crypto.randomUUID()}`,
        },
        select: { id: true },
      });

      const { createCaller } = await import("@/server/api/root");
      const caller = createCaller(async () => {
        return {
          db,
          headers: new Headers(),
          _authUser: {
            id: user.id,
          } as unknown as TRPCInternalContext["_authUser"],
        };
      });

      let releaseUpdate: (() => void) | undefined;
      const updateGate = new Promise<void>((resolve) => {
        releaseUpdate = () => resolve();
      });

      let captureRefresh = false;
      let resolveRefreshSnapshot!: () => void;
      const refreshSnapshot = new Promise<void>((resolve) => {
        resolveRefreshSnapshot = resolve;
      });

      const delayUpdateLink: TRPCLink<AppRouter> = () => {
        return ({ op, next }) =>
          observable((emit) => {
            let sub:
              | ReturnType<ReturnType<typeof next>["subscribe"]>
              | undefined;
            let cancelled = false;

            void (async () => {
              if (op.path === "dashboardDb.listing.update") {
                await updateGate;
              }

              if (cancelled) {
                return;
              }

              sub = next(op).subscribe({
                next: (value) => {
                  emit.next(value);
                  if (
                    captureRefresh &&
                    op.path === "dashboardDb.bootstrap.roots"
                  ) {
                    resolveRefreshSnapshot();
                  }
                },
                error: (err) => emit.error(err),
                complete: () => emit.complete(),
              });
            })();

            return () => {
              cancelled = true;
              sub?.unsubscribe();
            };
          });
      };

      const clientLike = createTRPCProxyClient<AppRouter>({
        links: [delayUpdateLink, callerLink(caller)],
      });

      const { setTestTrpcClient } = await import("@/trpc/client");
      setTestTrpcClient(clientLike);

      const { listingsCollection, updateListing } = await import(
        "@/app/dashboard/_lib/dashboard-db/listings-collection"
      );

      await act(async () => {
        await bootstrapDashboardDbFromServer(user.id);
        render(<ListingsViewer listingsCollection={listingsCollection} />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("titles").textContent).toBe("Alpha");
      });

      let updatePromise: Promise<void> | null = null;
      act(() => {
        updatePromise = updateListing({
          id: seeded.id,
          expectedUpdatedAt: new Date(
            listingsCollection.get(seeded.id)!.updatedAt,
          ).toISOString(),
          data: { title: "Beta" },
        }).then(() => undefined);
      });

      await waitFor(() => {
        expect(screen.getByTestId("titles").textContent).toBe("Beta");
      });

      captureRefresh = true;
      const refreshPromise = refreshDashboardDbFromServer(user.id);

      await act(async () => {
        await refreshSnapshot;
      });

      await waitFor(() => {
        expect(screen.getByTestId("titles").textContent).toBe("Beta");
      });

      releaseUpdate?.();

      if (updatePromise) {
        await act(async () => {
          await Promise.all([updatePromise, refreshPromise]);
        });
      }

      expect(await refreshPromise).toBe(false);

      await act(async () => {
        await listingsCollection.utils.refetch();
      });

      await waitFor(() => {
        expect(screen.getByTestId("titles").textContent).toBe("Beta");
      });
    });
  });

  it("listings: optimistic updates do not wait for an in-flight full refresh", async () => {
    await withTempAppDb(async ({ user }) => {
      const { bootstrapDashboardDbFromServer, refreshDashboardDbFromServer } =
        await import(
          "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence"
        );
      const { db } = await import("@/server/db");

      const seeded = await db.listing.create({
        data: {
          userId: user.id,
          title: "Alpha",
          slug: `alpha-${crypto.randomUUID()}`,
        },
        select: { id: true },
      });

      const { createCaller } = await import("@/server/api/root");
      const caller = createCaller(async () => {
        return {
          db,
          headers: new Headers(),
          _authUser: {
            id: user.id,
          } as unknown as TRPCInternalContext["_authUser"],
        };
      });

      let resolveBootstrapRoots!: () => void;
      const bootstrapRootsRead = new Promise<void>((resolve) => {
        resolveBootstrapRoots = resolve;
      });
      let releaseBootstrapRoots: (() => void) | undefined;
      const bootstrapRootsGate = new Promise<void>((resolve) => {
        releaseBootstrapRoots = () => resolve();
      });

      const delayRefreshLink: TRPCLink<AppRouter> = () => {
        return ({ op, next }) =>
          observable((emit) => {
            let sub:
              | ReturnType<ReturnType<typeof next>["subscribe"]>
              | undefined;
            let cancelled = false;

            sub = next(op).subscribe({
              next: (value) => {
                void (async () => {
                  if (op.path === "dashboardDb.bootstrap.roots") {
                    resolveBootstrapRoots();
                    await bootstrapRootsGate;
                  }

                  if (!cancelled) emit.next(value);
                })();
              },
              error: (err) => emit.error(err),
              complete: () => {
                void (async () => {
                  if (op.path === "dashboardDb.bootstrap.roots") {
                    await bootstrapRootsGate;
                  }

                  if (!cancelled) emit.complete();
                })();
              },
            });

            return () => {
              cancelled = true;
              sub?.unsubscribe();
            };
          });
      };

      const clientLike = createTRPCProxyClient<AppRouter>({
        links: [delayRefreshLink, callerLink(caller)],
      });

      const { setTestTrpcClient } = await import("@/trpc/client");

      const { listingsCollection, updateListing } = await import(
        "@/app/dashboard/_lib/dashboard-db/listings-collection"
      );

      await act(async () => {
        await bootstrapDashboardDbFromServer(user.id);
        render(<ListingsViewer listingsCollection={listingsCollection} />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("titles").textContent).toBe("Alpha");
      });

      setTestTrpcClient(clientLike);

      let refreshResolved = false;
      const refreshPromise = refreshDashboardDbFromServer(user.id).then(
        (applied) => {
          refreshResolved = true;
          return applied;
        },
      );

      await act(async () => {
        await bootstrapRootsRead;
      });

      let updateResolved = false;
      const updatePromise = updateListing({
        id: seeded.id,
        expectedUpdatedAt: new Date(
          listingsCollection.get(seeded.id)!.updatedAt,
        ).toISOString(),
        data: { title: "Beta" },
      }).then(() => {
        updateResolved = true;
      });

      await waitFor(() => {
        expect(updateResolved).toBe(true);
        expect(screen.getByTestId("titles").textContent).toBe("Beta");
      });

      expect(refreshResolved).toBe(false);
      expect(updateResolved).toBe(true);
      expect(screen.getByTestId("titles").textContent).toBe("Beta");

      releaseBootstrapRoots?.();

      await act(async () => {
        await Promise.all([refreshPromise, updatePromise]);
      });

      expect(await refreshPromise).toBe(false);

      await waitFor(() => {
        expect(screen.getByTestId("titles").textContent).toBe("Beta");
      });
    });
  });

  it("listings: insert -> update -> delete live updates", async () => {
    await withTempAppDb(async ({ user }) => {
      const { bootstrapDashboardDbFromServer } = await import(
        "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence"
      );
      const {
        listingsCollection,
        insertListing,
        updateListing,
        deleteListing,
      } = await import("@/app/dashboard/_lib/dashboard-db/listings-collection");

      await act(async () => {
        await bootstrapDashboardDbFromServer(user.id);
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
        await updateListing({
          id: createdId,
          expectedUpdatedAt: new Date(
            listingsCollection.get(createdId)!.updatedAt,
          ).toISOString(),
          data: { title: "Hello Updated" },
        });
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

  it("listings: queued create rejects when an auth transition drops it", async () => {
    await withTempAppDb(async ({ user }) => {
      const {
        bootstrapDashboardDbFromServer,
        resetDashboardRefreshLock,
        runWithDashboardRefreshLock,
      } = await import(
        "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence"
      );
      const { listingsCollection, insertListing } = await import(
        "@/app/dashboard/_lib/dashboard-db/listings-collection"
      );

      await act(async () => {
        await bootstrapDashboardDbFromServer(user.id);
        render(<ListingsViewer listingsCollection={listingsCollection} />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("0");
      });

      let releaseLock!: () => void;
      const heldLock = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });

      const holdLockPromise = runWithDashboardRefreshLock(
        async () => await heldLock,
      );

      await act(async () => {
        await Promise.resolve();
      });

      const createResultPromise = insertListing({ title: "Dropped" }).then(
        () => ({ ok: true as const, error: null }),
        (error: unknown) => ({ ok: false as const, error }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      resetDashboardRefreshLock();
      releaseLock();

      await act(async () => {
        await holdLockPromise;
      });

      const createResult = await createResultPromise;
      expect(createResult.ok).toBe(false);
      expect(createResult.error).toBeInstanceOf(Error);
      expect((createResult.error as Error).message).toBe(
        "Dashboard refresh work was cancelled",
      );

      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("0");
      });
    });
  });

  it("lists: update ignores undefined fields (no optimistic wipe)", async () => {
    await withTempAppDb(async ({ user }) => {
      const { bootstrapDashboardDbFromServer } = await import(
        "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence"
      );
      const { db } = await import("@/server/db");
      const { createCaller } = await import("@/server/api/root");
      const caller = createCaller(async () => {
        return {
          db,
          headers: new Headers(),
          _authUser: {
            id: user.id,
          } as unknown as TRPCInternalContext["_authUser"],
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

      const { listsCollection, updateList } = await import(
        "@/app/dashboard/_lib/dashboard-db/lists-collection"
      );

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
      expect(
        await caller.dashboardDb.list.get({ id: seeded.id }),
      ).toMatchObject({
        id: seeded.id,
      });

      await act(async () => {
        await bootstrapDashboardDbFromServer(user.id);
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
            expectedUpdatedAt: new Date(
              listsCollection.get(seeded.id)!.updatedAt,
            ).toISOString(),
            data: {
              title: undefined,
              description: "Updated description",
            },
          }).then(() => undefined);
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
    await withTempAppDb(async ({ user }) => {
      const { bootstrapDashboardDbFromServer } = await import(
        "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence"
      );
      const {
        listsCollection,
        insertList,
        addListingToList,
        removeListingFromList,
      } = await import("@/app/dashboard/_lib/dashboard-db/lists-collection");

      const { listingsCollection, insertListing } = await import(
        "@/app/dashboard/_lib/dashboard-db/listings-collection"
      );

      await act(async () => {
        await bootstrapDashboardDbFromServer(user.id);
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
    await withTempAppDb(async ({ user }) => {
      const { bootstrapDashboardDbFromServer } = await import(
        "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence"
      );
      const { insertListing } = await import(
        "@/app/dashboard/_lib/dashboard-db/listings-collection"
      );
      const { imagesCollection, createImage, reorderImages, deleteImage } =
        await import("@/app/dashboard/_lib/dashboard-db/images-collection");

      await act(async () => {
        await bootstrapDashboardDbFromServer(user.id);
      });

      let listingId = "";
      await act(async () => {
        const listing = await insertListing({ title: "WithImages" });
        listingId = listing.id;
      });

      await act(async () => {
        render(
          <ImagesViewer
            imagesCollection={imagesCollection}
            listingId={listingId}
          />,
        );
      });

      let u1Id = "";
      let u2Id = "";
      let url1 = "";
      let url2 = "";
      await act(async () => {
        const key1 = `${user.id}/${listingId}/u1.jpg`;
        const key2 = `${user.id}/${listingId}/u2.jpg`;
        url1 = `https://daylily-catalog-images-test.s3.us-east-1.amazonaws.com/${key1}`;
        url2 = `https://daylily-catalog-images-test.s3.us-east-1.amazonaws.com/${key2}`;
        const u1 = await createImage({
          type: "listing",
          referenceId: listingId,
          url: url1,
          key: key1,
        });
        const u2 = await createImage({
          type: "listing",
          referenceId: listingId,
          url: url2,
          key: key2,
        });
        u1Id = u1.id;
        u2Id = u2.id;
      });

      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("2");
        expect(screen.getByTestId("urls").textContent).toBe(`${url1},${url2}`);
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
        expect(screen.getByTestId("urls").textContent).toBe(`${url2},${url1}`);
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
        expect(screen.getByTestId("urls").textContent).toBe(url1);
        expect(screen.getByTestId("orders").textContent).toBe("0");
      });
    });
  });

  it("cultivar refs: linking updates live joined AHS fields", async () => {
    await withTempAppDb(async ({ user }) => {
      const { bootstrapDashboardDbFromServer } = await import(
        "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence"
      );
      const { db } = await import("@/server/db");

      const v2AhsCultivar = await db.v2AhsCultivar.create({
        data: {
          id: "v2-alpha",
          post_title: "AHS-Alpha",
          link_normalized_name: "ahs-alpha",
        },
      });
      const cultivarRef = await db.cultivarReference.create({
        data: {
          v2AhsCultivarId: v2AhsCultivar.id,
          normalizedName: "ahs-alpha",
        },
      });

      const { listingsCollection, insertListing, linkAhs } = await import(
        "@/app/dashboard/_lib/dashboard-db/listings-collection"
      );
      const { cultivarReferencesCollection } = await import(
        "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection"
      );

      await act(async () => {
        await bootstrapDashboardDbFromServer(user.id);
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
          syncName: true,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId("joined").textContent).toBe(
          "AHS-Alpha:AHS-Alpha",
        );
      });
    });
  }, 15_000);

  it("loads cultivar references before publishing point-fetched listings", async () => {
    await withTempAppDb(async ({ user }) => {
      const { bootstrapDashboardDbFromServer } = await import(
        "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence"
      );
      const { db } = await import("@/server/db");
      const { listingsCollection, loadMissingListing, loadListingsByIds } =
        await import("@/app/dashboard/_lib/dashboard-db/listings-collection");
      const { cultivarReferencesCollection } = await import(
        "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection"
      );

      await bootstrapDashboardDbFromServer(user.id);
      const cultivar = await db.v2AhsCultivar.create({
        data: {
          id: "v2-point-load",
          post_title: "Point Load Cultivar",
          link_normalized_name: "point-load-cultivar",
        },
      });
      const reference = await db.cultivarReference.create({
        data: {
          v2AhsCultivarId: cultivar.id,
          normalizedName: "point-load-cultivar",
        },
      });
      const secondCultivar = await db.v2AhsCultivar.create({
        data: {
          id: "v2-batch-load",
          post_title: "Batch Load Cultivar",
          link_normalized_name: "batch-load-cultivar",
        },
      });
      const secondReference = await db.cultivarReference.create({
        data: {
          v2AhsCultivarId: secondCultivar.id,
          normalizedName: "batch-load-cultivar",
        },
      });
      const first = await db.listing.create({
        data: {
          userId: user.id,
          title: "First remote listing",
          slug: "first-remote-listing",
          cultivarReferenceId: reference.id,
        },
      });
      const second = await db.listing.create({
        data: {
          userId: user.id,
          title: "Second remote listing",
          slug: "second-remote-listing",
          cultivarReferenceId: secondReference.id,
        },
      });
      expect(cultivarReferencesCollection.get(reference.id)).toBeUndefined();

      await act(async () => loadMissingListing(first.id));
      expect(listingsCollection.get(first.id)?.cultivarReferenceId).toBe(
        reference.id,
      );
      expect(
        cultivarReferencesCollection.get(reference.id)?.ahsListing?.name,
      ).toBe("Point Load Cultivar");

      await act(async () => loadListingsByIds([second.id]));
      expect(listingsCollection.get(second.id)?.cultivarReferenceId).toBe(
        secondReference.id,
      );
      expect(
        cultivarReferencesCollection.get(secondReference.id)?.ahsListing?.name,
      ).toBe("Batch Load Cultivar");
    });
  }, 15_000);
});
