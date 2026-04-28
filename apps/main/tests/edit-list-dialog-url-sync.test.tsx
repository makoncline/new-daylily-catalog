import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEditList } from "@/app/dashboard/lists/_components/edit-list-dialog";

const navigationState = vi.hoisted(() => {
  let pathname = "/dashboard/lists";
  let search = "editing=list-1";

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

function EditListHookHarness() {
  const { editingId, closeEditList } = useEditList();

  return (
    <button type="button" onClick={closeEditList}>
      {editingId ?? "none"}
    </button>
  );
}

describe("useEditList URL sync", () => {
  beforeEach(() => {
    navigationState.setSearch("editing=list-1");
    navigationState.push.mockClear();
    navigationState.replace.mockClear();
  });

  it("clears editing query without pushing a bare '?' URL", async () => {
    render(<EditListHookHarness />);

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("list-1");
    });

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(navigationState.replace).toHaveBeenCalledWith("/dashboard/lists");
    });
    expect(navigationState.push).not.toHaveBeenCalled();
    expect(
      navigationState.replace.mock.calls.some(([url]) => url === "?"),
    ).toBe(false);
  });
});
