import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileForm } from "@/components/forms/profile-form";

const state = vi.hoisted(() => ({
  initial: {
    id: "profile-1",
    userId: "user-1",
    title: "Old garden",
    slug: "my-garden",
    description: "Old description",
    location: "Denver",
    logoUrl: null,
    content: null,
    updatedAt: new Date("2026-09-25T12:00:00.000Z"),
  },
  saved: {
    id: "profile-1",
    userId: "user-1",
    title: "Old garden",
    slug: "my-garden",
    description: "Remote description",
    location: "Denver",
    logoUrl: null,
    content: null,
    updatedAt: new Date("2026-09-25T13:00:00.000Z"),
  },
}));
const updateProfile = vi.hoisted(() =>
  vi.fn<
    (input: {
      expectedUpdatedAt: string;
      data: { title?: string | null; description?: string | null };
    }) => Promise<unknown>
  >(),
);
const profileUtils = vi.hoisted(() => ({
  dashboardDb: {
    userProfile: {
      get: {
        setData: vi.fn(),
        invalidate: vi.fn(async () => undefined),
        fetch: vi.fn(async () => state.saved),
      },
    },
  },
}));

vi.mock("@/trpc/react", () => ({
  api: {
    useUtils: () => profileUtils,
    dashboardDb: {
      userProfile: {
        update: { useMutation: () => ({ mutateAsync: updateProfile }) },
        checkSlug: { useQuery: () => ({ refetch: vi.fn() }) },
      },
    },
  },
}));
vi.mock("@/hooks/use-pro", () => ({
  usePro: () => ({ isPro: false }),
}));
vi.mock("@/hooks/use-dashboard-section-focus", () => ({
  useDashboardSectionFocus: () => undefined,
}));
vi.mock("@/app/dashboard/profile/_components/profile-image-manager", () => ({
  ProfileImageManager: () => null,
}));
vi.mock("@/components/checkout-button", () => ({
  CheckoutButton: () => null,
}));
vi.mock("@/components/slug-change-confirm-dialog", () => ({
  SlugChangeConfirmDialog: () => null,
}));
vi.mock("@/components/forms/content-form", () => ({
  ContentManagerFormItem: ({
    onMutationSuccess,
  }: {
    onMutationSuccess: (profile: typeof state.saved) => void;
  }) => (
    <button type="button" onClick={() => onMutationSuccess(state.saved)}>
      Save story elsewhere
    </button>
  ),
}));

describe("profile fields after a story save", () => {
  beforeEach(() => {
    updateProfile.mockReset();
    state.saved = {
      ...state.initial,
      description: "Remote description",
      updatedAt: new Date("2026-09-25T13:00:00.000Z"),
    };
  });

  it("keeps a local garden name and adopts the latest description", async () => {
    updateProfile.mockResolvedValue(state.saved);
    render(<ProfileForm initialProfile={state.initial as never} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Garden Name" }), {
      target: { value: "Local garden" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save story elsewhere" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    const input = updateProfile.mock.calls[0]?.[0];
    expect(input?.expectedUpdatedAt).toBe("2026-09-25T13:00:00.000Z");
    expect(input?.data).toMatchObject({
      title: "Local garden",
      description: "Remote description",
    });
  });

  it("keeps the old version when the garden name also changed remotely", async () => {
    state.saved = { ...state.saved, title: "Remote garden" };
    updateProfile.mockRejectedValue(
      new Error("Profile changed. Load the latest version."),
    );
    render(<ProfileForm initialProfile={state.initial as never} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Garden Name" }), {
      target: { value: "Local garden" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save story elsewhere" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Your unsaved fields are still here",
    );
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    expect(updateProfile.mock.calls[0]?.[0].expectedUpdatedAt).toBe(
      "2026-09-25T12:00:00.000Z",
    );
  });
});
