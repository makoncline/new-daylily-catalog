"use client";

import { useQueryParamDialogState } from "@/hooks/use-dialog-search-param";

export function useListingDialogQueryState() {
  const { setValue, value } = useQueryParamDialogState({
    history: "push",
    paramName: "viewing",
    scroll: false,
  });

  return {
    viewingId: value,
    openListing: (id: string) => {
      setValue(id);
    },
    closeListing: () => {
      setValue(null);
    },
  };
}
