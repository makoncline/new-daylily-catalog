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
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          revalidatedPath: "/cultivar/coffee-frenzy",
        }),
      }),
    );
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
