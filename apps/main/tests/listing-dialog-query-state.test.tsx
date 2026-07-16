import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useListingDialogQueryState } from "@/hooks/use-listing-dialog-query-state";

const navigationState = vi.hoisted(() => {
  let pathname = "/grower";
  let search = "utm_source=test";

  const navigate = (url: string) => {
    const nextUrl = new URL(url, "https://example.com");
    pathname = nextUrl.pathname;
    search = nextUrl.search.startsWith("?")
      ? nextUrl.search.slice(1)
      : nextUrl.search;
  };

  return {
    getPathname: () => pathname,
    getSearch: () => search,
    navigate,
    setSearch: (value: string) => {
      search = value;
    },
  };
});

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
  usePathname: () => navigationState.getPathname(),
  useSearchParams: () => new URLSearchParams(navigationState.getSearch()),
}));

describe("useListingDialogQueryState", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    navigationState.setSearch("utm_source=test");
    routerPush.mockClear();
    vi.spyOn(window.history, "pushState").mockImplementation(
      (_data, _unused, url) => {
        if (url) {
          navigationState.navigate(url.toString());
        }
      },
    );
  });

  it("updates the viewing query while preserving unrelated params", () => {
    const { result, rerender } = renderHook(() => useListingDialogQueryState());

    expect(result.current.viewingId).toBeNull();

    act(() => {
      result.current.openListing("listing-1");
    });

    expect(window.history.pushState).toHaveBeenCalledWith(
      window.history.state,
      "",
      "/grower?utm_source=test&viewing=listing-1",
    );
    expect(routerPush).not.toHaveBeenCalled();

    rerender();
    expect(result.current.viewingId).toBe("listing-1");

    act(() => {
      result.current.closeListing();
    });

    expect(window.history.pushState).toHaveBeenCalledWith(
      window.history.state,
      "",
      "/grower?utm_source=test",
    );

    rerender();
    expect(result.current.viewingId).toBeNull();
  });
});
