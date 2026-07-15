import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEditListing } from "@/app/dashboard/listings/_components/edit-listing-dialog";
import { useCreateListing } from "@/app/dashboard/listings/_components/create-listing-dialog";

const navigationState = vi.hoisted(() => {
  let pathname = "/dashboard/listings";
  let search = "editing=listing-1";

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

function CreateListingHookHarness() {
  const { finishCreateListing } = useCreateListing();

  return (
    <button type="button" onClick={() => finishCreateListing("listing-2")}>
      Finish creating
    </button>
  );
}

describe("useEditListing URL sync", () => {
  beforeEach(() => {
    navigationState.setSearch("editing=listing-1");
    navigationState.push.mockClear();
    navigationState.replace.mockClear();
  });

  it("replaces the editing query without pushing a bare '?' URL", async () => {
    render(<EditListingHookHarness />);

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("listing-1");
    });

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(navigationState.replace).toHaveBeenCalledWith(
        "/dashboard/listings",
        { scroll: false },
      );
    });
    expect(navigationState.push).not.toHaveBeenCalled();
    expect(navigationState.push.mock.calls.some(([url]) => url === "?")).toBe(
      false,
    );
  });

  it("replaces create mode with edit mode after creation", async () => {
    navigationState.setSearch("creating=true");
    render(<CreateListingHookHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Finish creating" }));

    await waitFor(() => {
      expect(navigationState.replace).toHaveBeenCalledWith(
        "/dashboard/listings?editing=listing-2",
        { scroll: false },
      );
    });
    expect(navigationState.push).not.toHaveBeenCalled();
  });

  it("follows browser history changes to the editing query", async () => {
    const { rerender } = render(<EditListingHookHarness />);

    expect(screen.getByRole("button")).toHaveTextContent("listing-1");

    navigationState.setSearch("");
    rerender(<EditListingHookHarness />);

    expect(screen.getByRole("button")).toHaveTextContent("none");
  });
});
