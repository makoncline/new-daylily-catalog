"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

interface UseEditingQueryParamSyncOptions {
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  navigationMethod: "push" | "replace";
  paramName?: string;
}

export function useEditingQueryParamSync({
  editingId,
  setEditingId,
  navigationMethod,
  paramName = "editing",
}: UseEditingQueryParamSyncOptions): void {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }

    const initialEditingId = searchParams.get(paramName);
    if (initialEditingId) {
      setEditingId(initialEditingId);
    }

    hasInitializedRef.current = true;
  }, [paramName, searchParams, setEditingId]);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (editingId) {
      params.set(paramName, editingId);
    } else {
      params.delete(paramName);
    }

    const nextSearch = params.toString();
    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    const currentSearch = searchParams.toString();
    const currentUrl = currentSearch ? `${pathname}?${currentSearch}` : pathname;

    if (nextUrl === currentUrl) {
      return;
    }

    if (navigationMethod === "replace") {
      router.replace(nextUrl);
      return;
    }

    router.push(nextUrl);
  }, [
    editingId,
    navigationMethod,
    paramName,
    pathname,
    router,
    searchParams,
  ]);
}
