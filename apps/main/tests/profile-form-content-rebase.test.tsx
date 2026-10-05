import { createRef } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createTRPCQueryUtils } from "@trpc/react-query";
import { createTRPCClient, TRPCClientError } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ProfileForm,
  type ProfileFormHandle,
} from "@/components/forms/profile-form";
import { getQueryClient, resetQueryClient } from "@/trpc/query-client";
import type { AppRouter } from "@/server/api/root";
import type { RouterOutputs } from "@/trpc/react";

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
    createdAt: new Date("2026-09-25T12:00:00.000Z"),
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
    createdAt: new Date("2026-09-25T12:00:00.000Z"),
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
        fetch: vi.fn(
          async (
            _input?: void,
            _options?: { staleTime?: number },
          ): Promise<RouterOutputs["dashboardDb"]["userProfile"]["get"]> =>
            state.saved,
        ),
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
    vi.clearAllMocks();
    updateProfile.mockReset();
    profileUtils.dashboardDb.userProfile.get.fetch.mockImplementation(
      async () => state.saved,
    );
    state.saved = {
      ...state.initial,
      description: "Remote description",
      updatedAt: new Date("2026-09-25T13:00:00.000Z"),
    };
  });

  afterEach(resetQueryClient);

  it("keeps a local garden name and adopts the latest description", async () => {
    updateProfile.mockResolvedValue(state.saved);
    render(<ProfileForm initialProfile={state.initial} />);

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
    render(<ProfileForm initialProfile={state.initial} />);

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

  it("reads the server profile during conflict recovery even when the cache is fresh", async () => {
    const queryClient = getQueryClient();
    const networkRead = vi.fn(() => state.saved);
    const client = createTRPCClient<AppRouter>({
      links: [
        () => () =>
          observable((observer) => {
            observer.next({ result: { data: networkRead() } });
            observer.complete();
          }),
      ],
    });
    const realUtils = createTRPCQueryUtils<AppRouter>({ client, queryClient });
    realUtils.dashboardDb.userProfile.get.setData(undefined, state.initial);
    profileUtils.dashboardDb.userProfile.get.fetch.mockImplementation(
      (input, options) =>
        realUtils.dashboardDb.userProfile.get.fetch(input, options),
    );
    state.saved.title = "Latest server garden";
    updateProfile.mockRejectedValueOnce(
      TRPCClientError.from<AppRouter>({
        error: {
          code: -32009,
          message:
            "The profile changed. Load the latest version before saving.",
          data: { code: "CONFLICT", httpStatus: 409, zodError: null },
        },
      }),
    );
    render(<ProfileForm initialProfile={state.initial} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Garden Name" }), {
      target: { value: "Local draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await screen.findByRole("status");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Discard unsaved profile fields and load the latest profile",
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Garden Name" })).toHaveValue(
        "Latest server garden",
      ),
    );
    expect(networkRead).toHaveBeenCalledOnce();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    updateProfile.mockResolvedValue(state.saved);
    fireEvent.change(screen.getByRole("textbox", { name: "Garden Name" }), {
      target: { value: "New local garden" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(2));
    expect(updateProfile.mock.calls[1]?.[0]).toMatchObject({
      expectedUpdatedAt: state.saved.updatedAt.toISOString(),
      data: { title: "New local garden" },
    });
  });

  it("keeps text typed while a navigation save is pending", async () => {
    let finishSave!: (profile: typeof state.initial) => void;
    updateProfile.mockReturnValue(
      new Promise((resolve) => {
        finishSave = resolve;
      }),
    );
    const formRef = createRef<ProfileFormHandle>();
    render(<ProfileForm initialProfile={state.initial} formRef={formRef} />);
    const name = screen.getByRole("textbox", { name: "Garden Name" });
    fireEvent.change(name, { target: { value: "Submitted garden" } });
    let result!: Promise<boolean>;
    act(() => {
      result = formRef.current!.saveChanges("navigate");
    });
    await waitFor(() => expect(updateProfile).toHaveBeenCalledOnce());
    fireEvent.change(name, { target: { value: "New draft" } });
    await act(async () => {
      finishSave({
        ...state.initial,
        title: "Submitted garden",
        updatedAt: state.saved.updatedAt,
      });
      expect(await result).toBe(false);
    });
    expect(name).toHaveValue("New draft");
    expect(formRef.current?.hasPendingChanges()).toBe(true);
    updateProfile.mockResolvedValue({ ...state.saved, title: "New draft" });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(2));
    expect(updateProfile.mock.calls[1]?.[0]).toMatchObject({
      expectedUpdatedAt: state.saved.updatedAt.toISOString(),
      data: { title: "New draft" },
    });
  });

  it("keeps the newer story version when an older field response arrives", async () => {
    let finishSave!: (profile: typeof state.initial) => void;
    updateProfile.mockReturnValue(
      new Promise((resolve) => {
        finishSave = resolve;
      }),
    );
    render(<ProfileForm initialProfile={state.initial} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Garden Name" }), {
      target: { value: "Submitted garden" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledOnce());
    state.saved = { ...state.saved, title: "Submitted garden" };
    fireEvent.click(
      screen.getByRole("button", { name: "Save story elsewhere" }),
    );
    await act(async () => {
      finishSave({
        ...state.initial,
        title: "Submitted garden",
        updatedAt: new Date("2026-09-25T12:30:00.000Z"),
      });
    });
    expect(
      profileUtils.dashboardDb.userProfile.get.setData.mock.lastCall?.[1],
    ).toEqual(state.saved);
    fireEvent.change(screen.getByRole("textbox", { name: "Location" }), {
      target: { value: "New location" },
    });
    updateProfile.mockResolvedValue({
      ...state.saved,
      location: "New location",
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(2));
    expect(updateProfile.mock.calls[1]?.[0].expectedUpdatedAt).toBe(
      state.saved.updatedAt.toISOString(),
    );
  });
});
