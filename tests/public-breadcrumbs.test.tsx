import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetListing = vi.hoisted(() => vi.fn());
const mockGetProfile = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/63/6263",
}));

vi.mock("@/trpc/react", () => ({
  api: {
    public: {
      getProfile: {
        useQuery: (...args: unknown[]) => mockGetProfile(...args),
      },
      getListing: {
        useQuery: (...args: unknown[]) => mockGetListing(...args),
      },
    },
  },
}));

import { PublicBreadcrumbs } from "@/app/(public)/_components/public-breadcrumbs";

describe("PublicBreadcrumbs", () => {
  beforeEach(() => {
    mockGetListing.mockClear();
    mockGetProfile.mockClear();
    mockGetListing.mockReturnValue({ data: { title: "FromQuery" } });
    mockGetProfile.mockReturnValue({ data: { id: "63", title: "Catalog" } });
  });

  it("skips listing query when listingTitle is provided", () => {
    render(
      <PublicBreadcrumbs
        profile={{ id: "63", title: "Catalog" }}
        listingTitle="FromServer"
      />,
    );

    expect(mockGetListing).toHaveBeenCalledTimes(1);
    const [input, options] = mockGetListing.mock.calls[0] ?? [];
    expect(input).toEqual({ userSlugOrId: "63", listingSlugOrId: "6263" });
    expect(options).toMatchObject({ enabled: false });
  });

  it("fetches listing when listingTitle is not provided", () => {
    render(<PublicBreadcrumbs profile={{ id: "63", title: "Catalog" }} />);

    expect(mockGetListing).toHaveBeenCalledTimes(1);
    const [input, options] = mockGetListing.mock.calls[0] ?? [];
    expect(input).toEqual({ userSlugOrId: "63", listingSlugOrId: "6263" });
    expect(options).toMatchObject({ enabled: true });
  });
});
