import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useListingDialogQueryState } from "@/hooks/use-listing-dialog-query-state";

const navigationState = vi.hoisted(() => {
  let pathname = "/grower";
  let search = "utm_source=test";

  const push = vi.fn((url: string) => {
    const nextUrl = new URL(url, "https://example.com");
    pathname = nextUrl.pathname;
    search = nextUrl.search.startsWith("?")
      ? nextUrl.search.slice(1)
      : nextUrl.search;
  });

  return {
    getPathname: () => pathname,
    getSearch: () => search,
    setSearch: (value: string) => {
      search = value;
    },
    push,
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigationState.push,
  }),
  usePathname: () => navigationState.getPathname(),
  useSearchParams: () => new URLSearchParams(navigationState.getSearch()),
}));

describe("useListingDialogQueryState", () => {
  beforeEach(() => {
    navigationState.setSearch("utm_source=test");
    navigationState.push.mockClear();
  });

  it("updates the viewing query while preserving unrelated params", () => {
    const { result, rerender } = renderHook(() =>
      useListingDialogQueryState(),
    );

    expect(result.current.viewingId).toBeNull();

    act(() => {
      result.current.openListing("listing-1");
    });

    expect(navigationState.push).toHaveBeenCalledWith(
      "/grower?utm_source=test&viewing=listing-1",
      { scroll: false },
    );

    rerender();
    expect(result.current.viewingId).toBe("listing-1");

    act(() => {
      result.current.closeListing();
    });

    expect(navigationState.push).toHaveBeenCalledWith(
      "/grower?utm_source=test",
      { scroll: false },
    );

    rerender();
    expect(result.current.viewingId).toBeNull();
  });
});
