"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { PublicCatalogSearchMode } from "@/components/public-catalog-search/public-catalog-search-types";

export function useListingsNextUrlState() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pushParams = useCallback(
    (update: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(window.location.search);
      update(params);
      const query = params.toString();
      window.history.pushState(
        null,
        "",
        query ? `${pathname}?${query}` : pathname,
      );
    },
    [pathname],
  );

  const updateParam = useCallback(
    (name: string, value: string | null) => {
      pushParams((params) => {
        if (value === null) params.delete(name);
        else params.set(name, value);
      });
    },
    [pushParams],
  );

  const searchMode: PublicCatalogSearchMode =
    searchParams.get("advanced") === "1" ? "advanced" : "basic";
  const searchCollapsed = searchParams.get("search") === "collapsed";

  const openCreatedListing = useCallback(
    (id: string) => {
      pushParams((params) => {
        params.delete("creating");
        params.delete("section");
        params.set("editing", id);
      });
    },
    [pushParams],
  );

  const setEditingId = useCallback(
    (id: string | null) => {
      pushParams((params) => {
        if (id === null) params.delete("editing");
        else params.set("editing", id);
        params.delete("section");
      });
    },
    [pushParams],
  );

  return {
    creating: searchParams.get("creating") === "1",
    editingId: searchParams.get("editing"),
    imageSectionRequested: searchParams.get("section") === "images",
    searchMode,
    searchCollapsed,
    openCreatedListing,
    setCreating: (open: boolean) => updateParam("creating", open ? "1" : null),
    setEditingId,
    setSearchMode: (mode: PublicCatalogSearchMode) =>
      updateParam("advanced", mode === "advanced" ? "1" : null),
    setSearchCollapsed: (value: boolean | ((current: boolean) => boolean)) => {
      const next = typeof value === "function" ? value(searchCollapsed) : value;
      updateParam("search", next ? "collapsed" : null);
    },
  };
}
