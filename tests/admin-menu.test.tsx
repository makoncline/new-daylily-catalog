import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRouterRefresh = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/cultivar/coffee-frenzy",
  useRouter: () => ({
    refresh: mockRouterRefresh,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

import { AdminMenu } from "@/components/admin-menu";

describe("AdminMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: string, init?: RequestInit) => {
        if (input.startsWith("/api/admin/revalidate-path?path=")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              path: "/cultivar/coffee-frenzy",
              cacheStatus: "HIT",
              cachedAtIso: "2026-02-20T18:00:00.000Z",
              cachedAtSource: "date-age",
            }),
          });
        }

        if (
          input === "/api/admin/revalidate-path" &&
          init?.method === "POST"
        ) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              revalidatedPath: "/cultivar/coffee-frenzy",
            }),
          });
        }

        return Promise.resolve({
          ok: false,
          json: async () => ({
            error: "Unexpected fetch call",
          }),
        });
      }),
    );
  });

  it("shows cache metadata for the current page when the menu opens", async () => {
    render(<AdminMenu />);

    fireEvent.keyDown(window, {
      code: "KeyX",
      ctrlKey: true,
      altKey: true,
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/revalidate-path?path=%2Fcultivar%2Fcoffee-frenzy",
        {
          method: "GET",
          cache: "no-store",
        },
      );
    });
    expect(fetch).toHaveBeenCalledTimes(1);

    expect(screen.getByText("Cache status: HIT")).toBeInTheDocument();
    expect(
      screen.getByText("Cached at: 2026-02-20T18:00:00.000Z"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Cache timestamp source: date-age"),
    ).toBeInTheDocument();
  });

  it("revalidates the current page from the keyboard-opened admin menu", async () => {
    render(<AdminMenu />);

    fireEvent.keyDown(window, {
      code: "KeyX",
      ctrlKey: true,
      altKey: true,
    });

    expect(
      screen.getByRole("heading", { name: "Admin Menu" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Revalidate current page" }),
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/admin/revalidate-path", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          path: "/cultivar/coffee-frenzy",
        }),
      });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith("Revalidated current page", {
      description: "/cultivar/coffee-frenzy",
    });
    expect(mockRouterRefresh).toHaveBeenCalledTimes(1);
    expect(mockToastError).not.toHaveBeenCalled();
  });
});
