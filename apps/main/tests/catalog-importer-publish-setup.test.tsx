import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogImporterPublishSetup } from "@/app/dashboard/imports/setup/catalog-importer-publish-setup";
import { CATALOG_IMPORTER_PUBLISH_SETUP_COMPLETE_PATH } from "@/lib/catalog-importer-membership";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  profileQuery: {
    data: {
      location: null,
      slug: "user-12345",
      title: null,
      userId: "user-12345",
    } as
      | {
          location: string | null;
          slug: string;
          title: string | null;
          userId: string;
        }
      | undefined,
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  },
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      emailAddresses: [{ emailAddress: "grower@example.com" }],
      primaryEmailAddress: { emailAddress: "grower@example.com" },
    },
  }),
}));

vi.mock("@/lib/analytics/posthog", () => ({
  capturePosthogEvent: vi.fn(),
}));

vi.mock("@/trpc/react", () => ({
  api: {
    dashboardDb: {
      userProfile: {
        get: {
          useQuery: () => mocks.profileQuery,
        },
        update: {
          useMutation: () => ({
            error: null,
            isPending: false,
            mutateAsync: mocks.mutateAsync,
          }),
        },
      },
    },
  },
}));

describe("CatalogImporterPublishSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profileQuery.data = {
      location: null,
      slug: "user-12345",
      title: null,
      userId: "user-12345",
    };
    mocks.profileQuery.isError = false;
    mocks.profileQuery.isFetching = false;
    mocks.profileQuery.isLoading = false;
    mocks.mutateAsync.mockResolvedValue({});
  });

  it("saves the minimum public catalog details before import", async () => {
    render(<CatalogImporterPublishSetup />);

    fireEvent.change(
      screen.getByRole("textbox", { name: "Catalog or nursery name" }),
      { target: { value: "Sunrise Daylilies" } },
    );
    fireEvent.change(screen.getByRole("textbox", { name: /Location/ }), {
      target: { value: "Fort Collins, Colorado" },
    });

    expect(
      screen.getByRole("textbox", { name: "Public catalog address" }),
    ).toHaveValue("sunrise-daylilies");
    expect(screen.getByRole("textbox", { name: "Inquiry email" })).toHaveValue(
      "grower@example.com",
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue to import" }));

    await waitFor(() =>
      expect(mocks.mutateAsync).toHaveBeenCalledWith({
        data: {
          location: "Fort Collins, Colorado",
          slug: "sunrise-daylilies",
          title: "Sunrise Daylilies",
        },
      }),
    );
    expect(mocks.replace).toHaveBeenCalledWith(
      CATALOG_IMPORTER_PUBLISH_SETUP_COMPLETE_PATH,
    );
  });

  it("requires a successful profile load before it shows the form", () => {
    mocks.profileQuery.data = undefined;
    mocks.profileQuery.isError = true;

    render(<CatalogImporterPublishSetup />);

    expect(
      screen.queryByRole("textbox", { name: "Catalog or nursery name" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.profileQuery.refetch).toHaveBeenCalledOnce();
  });
});
