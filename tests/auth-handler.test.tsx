import React from "react";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockUseAuthResult {
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
    useAuthMock.mockReturnValue({ userId: "user-a" });

    const { AuthHandler } = await import("@/components/auth-handler");
    render(<AuthHandler />);

    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("reloads when the dashboard user logs out", async () => {
    useAuthMock.mockReturnValue({ userId: "user-a" });

    const { AuthHandler } = await import("@/components/auth-handler");
    const view = render(<AuthHandler />);

    useAuthMock.mockReturnValue({ userId: null });
    view.rerender(<AuthHandler />);

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("reloads when the dashboard user switches accounts", async () => {
    useAuthMock.mockReturnValue({ userId: "user-a" });

    const { AuthHandler } = await import("@/components/auth-handler");
    const view = render(<AuthHandler />);

    useAuthMock.mockReturnValue({ userId: "user-b" });
    view.rerender(<AuthHandler />);

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
