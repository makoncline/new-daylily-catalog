"use client";

import { useMemo } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { api, type RouterOutputs } from "@/trpc/react";
import { DashboardPageClient } from "./_components/dashboard-page-client";
import { getQueryClient } from "@/trpc/query-client";
import { listingsCollection } from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import { listsCollection } from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { imagesCollection } from "@/app/dashboard/_lib/dashboard-db/images-collection";
import { buildDashboardStats } from "@/app/dashboard/_lib/build-dashboard-stats";

type Listing = RouterOutputs["dashboardDb"]["listing"]["list"][number];
type List = RouterOutputs["dashboardDb"]["list"]["list"][number];
type Image = RouterOutputs["dashboardDb"]["image"]["list"][number];

export default function DashboardPage() {
  const { data: baseListings = [], isReady: isListingsReady } = useLiveQuery(
    (q) =>
      q
        .from({ listing: listingsCollection })
        .orderBy(({ listing }) => listing.createdAt, "desc"),
  );
  const { data: baseLists = [], isReady: isListsReady } = useLiveQuery((q) =>
    q.from({ list: listsCollection }).orderBy(({ list }) => list.createdAt, "desc"),
  );
  const { data: baseImages = [], isReady: isImagesReady } = useLiveQuery((q) =>
    q.from({ image: imagesCollection }).orderBy(({ image }) => image.updatedAt, "asc"),
  );

  const queryClient = getQueryClient();

  const seededListings =
    queryClient.getQueryData<Listing[]>(["dashboard-db", "listings"]) ?? [];
  const seededLists =
    queryClient.getQueryData<List[]>(["dashboard-db", "lists"]) ?? [];
  const seededImages =
    queryClient.getQueryData<Image[]>(["dashboard-db", "images"]) ?? [];

  const listings = isListingsReady ? baseListings : seededListings;
  const lists = isListsReady ? baseLists : seededLists;
  const images = isImagesReady ? baseImages : seededImages;

  const { data: profile = null } = api.dashboardDb.userProfile.get.useQuery(
    undefined,
    {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  );

  const stats = useMemo(
    () =>
      buildDashboardStats({
        listings,
        lists,
        images,
        profile,
      }),
    [images, lists, listings, profile],
  );

  return <DashboardPageClient initialStats={stats} />;
}
