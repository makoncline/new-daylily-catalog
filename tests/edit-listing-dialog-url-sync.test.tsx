import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEditListing } from "@/app/dashboard/listings/_components/edit-listing-dialog";

const navigationState = vi.hoisted(() => {
  let pathname = "/dashboard/listings";
  let search = "editing=listing-1&view=grid";

  const push = vi.fn((url: string) => {
    const nextUrl = new URL(url, "https://example.com");
    pathname = nextUrl.pathname;
    search = nextUrl.search.startsWith("?")
      ? nextUrl.search.slice(1)
      : nextUrl.search;
  });

  const replace = vi.fn((url: string) => {
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
    replace,
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigationState.push,
    replace: navigationState.replace,
  }),
  usePathname: () => navigationState.getPathname(),
  useSearchParams: () => new URLSearchParams(navigationState.getSearch()),
}));

function EditListingHookHarness() {
  const { editingId, closeEditListing } = useEditListing();

  return (
    <button type="button" onClick={closeEditListing}>
      {editingId ?? "none"}
    </button>
  );
}

describe("useEditListing URL sync", () => {
  beforeEach(() => {
    navigationState.setSearch("editing=listing-1&view=grid");
    navigationState.push.mockClear();
    navigationState.replace.mockClear();
  });

  it("clears only editing query and keeps unrelated params", async () => {
    render(<EditListingHookHarness />);

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("listing-1");
    });

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(navigationState.push).toHaveBeenCalledWith(
        "/dashboard/listings?view=grid",
      );
    });
    expect(navigationState.replace).not.toHaveBeenCalled();
    expect(navigationState.push.mock.calls.some(([url]) => url === "?")).toBe(
      false,
    );
  });
});
