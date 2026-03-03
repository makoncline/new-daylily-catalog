import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PosthogUserIdentification } from "@/components/posthog-user-identification";

interface MockPosthogUser {
  id: string;
  primaryEmailAddress: { emailAddress: string } | null;
}

interface MockUseUserResult {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: MockPosthogUser | null;
}

const useUserMock = vi.hoisted(() => vi.fn<() => MockUseUserResult>());
const identifyPosthogUserMock = vi.hoisted(() => vi.fn());
const resetPosthogUserMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({
  useUser: () => useUserMock(),
}));

vi.mock("@/lib/analytics/posthog", () => ({
  identifyPosthogUser: identifyPosthogUserMock,
  resetPosthogUser: resetPosthogUserMock,
}));

describe("PosthogUserIdentification", () => {
  beforeEach(() => {
    identifyPosthogUserMock.mockClear();
    resetPosthogUserMock.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("identifies the signed-in user", async () => {
    useUserMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {
        id: "user_123",
        primaryEmailAddress: {
          emailAddress: "user@example.com",
        },
      },
    });

    render(<PosthogUserIdentification />);

    await waitFor(() => {
      expect(identifyPosthogUserMock).toHaveBeenCalledTimes(1);
    });

    expect(identifyPosthogUserMock).toHaveBeenCalledWith({
      id: "user_123",
      email: "user@example.com",
    });
    expect(resetPosthogUserMock).not.toHaveBeenCalled();
  });

  it("resets identity when user signs out", async () => {
    useUserMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {
        id: "user_123",
        primaryEmailAddress: {
          emailAddress: "user@example.com",
        },
      },
    });

    const { rerender } = render(<PosthogUserIdentification />);

    await waitFor(() => {
      expect(identifyPosthogUserMock).toHaveBeenCalledTimes(1);
    });

    useUserMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      user: null,
    });

    rerender(<PosthogUserIdentification />);

    await waitFor(() => {
      expect(resetPosthogUserMock).toHaveBeenCalledTimes(1);
    });
  });
});
