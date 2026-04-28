import React from "react";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockUseAuthResult {
  isLoaded: boolean;
  userId: string | null;
}

const useAuthMock = vi.hoisted(() => vi.fn<() => MockUseAuthResult>());
const reloadMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => useAuthMock(),
}));

describe("AuthHandler", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    reloadMock.mockReset();

    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        reload: reloadMock,
      },
    });
  });

  it("does not reload on initial mount", async () => {
    useAuthMock.mockReturnValue({ isLoaded: true, userId: "user-a" });

    const { AuthHandler } = await import("@/components/auth-handler");
    render(<AuthHandler />);

    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("reloads when the dashboard user logs out", async () => {
    useAuthMock.mockReturnValue({ isLoaded: true, userId: "user-a" });

    const { AuthHandler } = await import("@/components/auth-handler");
    const view = render(<AuthHandler />);

    useAuthMock.mockReturnValue({ isLoaded: true, userId: null });
    view.rerender(<AuthHandler />);

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("reloads when the dashboard user switches accounts", async () => {
    useAuthMock.mockReturnValue({ isLoaded: true, userId: "user-a" });

    const { AuthHandler } = await import("@/components/auth-handler");
    const view = render(<AuthHandler />);

    useAuthMock.mockReturnValue({ isLoaded: true, userId: "user-b" });
    view.rerender(<AuthHandler />);

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("does not reload while Clerk is still loading", async () => {
    useAuthMock.mockReturnValue({ isLoaded: false, userId: null });

    const { AuthHandler } = await import("@/components/auth-handler");
    const view = render(<AuthHandler />);

    useAuthMock.mockReturnValue({ isLoaded: true, userId: "user-a" });
    view.rerender(<AuthHandler />);

    expect(reloadMock).not.toHaveBeenCalled();
  });
});
