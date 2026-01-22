// src/app/dashboard-two/listings/_components/use-edit-listing.ts
"use client";
import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const KEY = "editing";

export function useEditListing() {
  const params = useSearchParams();
  const router = useRouter();

  const id = params.get(KEY);

  const editListing = useCallback(
    (listingId: string) => {
      const usp = new URLSearchParams(params?.toString());
      usp.set(KEY, listingId);
      router.replace(`?${usp.toString()}`);
    },
    [params, router],
  );

  const closeEditListing = useCallback(() => {
    const usp = new URLSearchParams(params?.toString());
    usp.delete(KEY);
    router.replace(`?${usp.toString()}`);
  }, [params, router]);

  return useMemo(
    () => ({ editingId: id, editListing, closeEditListing }),
    [id, editListing, closeEditListing],
  );
}
