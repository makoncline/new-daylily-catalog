// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueMock = vi.hoisted(() => vi.fn());
const permanentRedirectMock = vi.hoisted(() => vi.fn());
const notFoundMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  db: {
    user: {
      findUnique: findUniqueMock,
    },
  },
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  permanentRedirect: permanentRedirectMock,
}));

describe("users legacy route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects /users/:userId directly to the canonical slug", async () => {
    findUniqueMock.mockResolvedValue({
      id: "user-1",
      profile: {
        slug: "garden",
      },
    });

    const { default: UsersLegacyRoutePage } = await import(
      "@/app/users/[userId]/page"
    );

    await UsersLegacyRoutePage({
      params: Promise.resolve({
        userId: "user-1",
      }),
      searchParams: Promise.resolve({}),
    });

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: {
        id: true,
        profile: {
          select: {
            slug: true,
          },
        },
      },
    });
    expect(permanentRedirectMock).toHaveBeenCalledWith("/garden");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("preserves query params while redirecting to the canonical slug", async () => {
    findUniqueMock.mockResolvedValue({
      id: "user-1",
      profile: {
        slug: "garden",
      },
    });

    const { default: UsersLegacyRoutePage } = await import(
      "@/app/users/[userId]/page"
    );

    await UsersLegacyRoutePage({
      params: Promise.resolve({
        userId: "user-1",
      }),
      searchParams: Promise.resolve({
        viewing: "listing-1",
        page: "2",
      }),
    });

    expect(permanentRedirectMock).toHaveBeenCalledWith(
      "/garden/page/2?viewing=listing-1",
    );
  });
});
