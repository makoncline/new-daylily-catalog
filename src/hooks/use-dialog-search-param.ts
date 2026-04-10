"use client";

import { type PrimitiveAtom, useAtom } from "jotai";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

interface SearchParamLike {
  get: (name: string) => string | null;
  toString: () => string;
}

interface QueryParamDialogStateOptions {
  history?: "push" | "replace";
  paramName: string;
  scroll?: boolean;
}

interface AtomDialogSearchParamOptions extends QueryParamDialogStateOptions {
  atom: PrimitiveAtom<string | null>;
}

function buildCurrentUrl(
  pathname: string | null,
  searchParams: Pick<SearchParamLike, "toString">,
) {
  const nextQuery = searchParams.toString();

  if (!pathname) {
    return nextQuery ? `?${nextQuery}` : "";
  }

  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function buildDialogSearchParamUrl(
  pathname: string | null,
  searchParams: Pick<SearchParamLike, "toString">,
  paramName: string,
  paramValue: string | null,
) {
  const params = new URLSearchParams(searchParams.toString());

  if (paramValue) {
    params.set(paramName, paramValue);
  } else {
    params.delete(paramName);
  }

  return buildCurrentUrl(pathname, params);
}

function navigateToUrl(
  history: "push" | "replace",
  router: ReturnType<typeof useRouter>,
  url: string,
  scroll?: boolean,
) {
  if (history === "replace") {
    if (typeof scroll === "boolean") {
      router.replace(url, { scroll });
      return;
    }

    router.replace(url);
    return;
  }

  if (typeof scroll === "boolean") {
    router.push(url, { scroll });
    return;
  }

  router.push(url);
}

export function useQueryParamDialogState({
  history = "push",
  paramName,
  scroll,
}: QueryParamDialogStateOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const value = searchParams.get(paramName);

  const setValue = (nextValue: string | null) => {
    const nextUrl = buildDialogSearchParamUrl(
      pathname,
      searchParams,
      paramName,
      nextValue,
    );

    navigateToUrl(history, router, nextUrl, scroll);
  };

  return {
    setValue,
    value,
  };
}

export function useAtomDialogSearchParam({
  atom,
  history = "push",
  paramName,
  scroll,
}: AtomDialogSearchParamOptions) {
  const [value, setValue] = useAtom(atom);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      return;
    }

    const nextUrl = buildDialogSearchParamUrl(
      pathname,
      searchParams,
      paramName,
      value,
    );
    const currentUrl = buildCurrentUrl(pathname, searchParams);

    if (nextUrl !== currentUrl) {
      navigateToUrl(history, router, nextUrl, scroll);
    }
  }, [history, paramName, pathname, router, scroll, searchParams, value]);

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }

    const urlValue = searchParams.get(paramName);
    if (urlValue) {
      setValue(urlValue);
    }

    hasInitializedRef.current = true;
  }, [paramName, searchParams, setValue]);

  return {
    close: () => {
      setValue(null);
    },
    open: (id: string) => {
      setValue(id);
    },
    value,
  };
}
