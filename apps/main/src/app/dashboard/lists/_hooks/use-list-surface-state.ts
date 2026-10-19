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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setValue, value } = useQueryParamDialogState({
    history: "push",
    paramName: "editing",
    scroll: false,
  });
  return {
    editList: (id: string) => setValue(id),
    closeEditList: () => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("editing");
      params.delete("intent");
      router.replace(params.size ? `${pathname}?${params}` : pathname, {
        scroll: false,
      });
    },
    editingId: value,
  };
};
