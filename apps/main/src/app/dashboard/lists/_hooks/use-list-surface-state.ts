"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryParamDialogState } from "@/hooks/use-dialog-search-param";
import { useListEligibility } from "./use-list-eligibility";

export function useCreateList() {
  const { setValue, value } = useQueryParamDialogState({
    history: "push",
    paramName: "creating",
    scroll: false,
  });
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eligibility = useListEligibility();

  return {
    ...eligibility,
    closeCreateList: () => setValue(null, "replace"),
    finishCreateList: (listId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("creating");
      params.set("editing", listId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    isCreateRequested: value === "true",
    openCreateList: () => setValue("true"),
  };
}

export const useEditList = () => {
  const { setValue, value } = useQueryParamDialogState({
    history: "push",
    paramName: "editing",
    scroll: false,
  });
  return {
    editList: (id: string) => setValue(id),
    closeEditList: () => setValue(null, "replace"),
    editingId: value,
  };
};
