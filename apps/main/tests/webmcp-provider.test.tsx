import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  trpcClient: {
    dashboardDb: {
      ahs: {
        search: { query: vi.fn() },
      },
      image: {
        getPresignedUrl: { mutate: vi.fn() },
      },
      list: {
        list: { query: vi.fn() },
        get: { query: vi.fn() },
      },
      listing: {
        get: { query: vi.fn() },
      },
      userProfile: {
        get: { query: vi.fn() },
        update: { mutate: vi.fn() },
        updateContent: { mutate: vi.fn() },
      },
    },
  },
  queryClient: {
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  },
  addListingToList: vi.fn(),
  createImage: vi.fn(),
  insertList: vi.fn(),
  insertListing: vi.fn(),
  linkAhs: vi.fn(),
  updateListing: vi.fn(),
  pathname: "/dashboard",
  userState: {
    isLoaded: true,
    isSignedIn: true,
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => mocks.userState,
}));

vi.mock("@/trpc/client", () => ({
  getTrpcClient: () => mocks.trpcClient,
}));

vi.mock("@/trpc/query-client", () => ({
  getQueryClient: () => mocks.queryClient,
}));

vi.mock("@/app/dashboard/_lib/dashboard-db/listings-collection", () => ({
  insertListing: mocks.insertListing,
  updateListing: mocks.updateListing,
  linkAhs: mocks.linkAhs,
}));

vi.mock("@/app/dashboard/_lib/dashboard-db/lists-collection", () => ({
  addListingToList: mocks.addListingToList,
  insertList: mocks.insertList,
}));

vi.mock("@/app/dashboard/_lib/dashboard-db/images-collection", () => ({
  createImage: mocks.createImage,
}));

import { WebMcpProvider } from "@/components/webmcp-provider";

function setModelContext(value: unknown) {
  Object.defineProperty(navigator, "modelContext", {
    configurable: true,
    value,
  });
}

describe("WebMcpProvider", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mocks.pathname = "/dashboard";
    mocks.userState = { isLoaded: true, isSignedIn: true };
    setModelContext(undefined);
  });

  test("registers dashboard tools with WebMCP on page load", async () => {
    const registerTool = vi.fn();
    setModelContext({ registerTool });

    const { unmount } = render(<WebMcpProvider />);

    await waitFor(() => {
      expect(registerTool).toHaveBeenCalled();
    });

    const toolNames = registerTool.mock.calls.map(([tool]) => tool.name);
    expect(toolNames).toEqual([
      "daylily.navigate",
      "daylily.dashboard-state",
      "daylily.search-cultivars",
      "daylily.update-profile",
      "daylily.update-profile-content",
      "daylily.create-listing",
      "daylily.update-listing",
      "daylily.create-list",
      "daylily.prepare-image-upload",
      "daylily.attach-uploaded-image",
      "daylily.add-listing-to-list",
    ]);
    registerTool.mock.calls.forEach(([tool]) => {
      expect(tool.annotations).toEqual(
        expect.objectContaining({
          readOnlyHint: expect.any(Boolean),
          destructiveHint: expect.any(Boolean),
          openWorldHint: expect.any(Boolean),
        }),
      );
    });
    const firstRegisterOptions = registerTool.mock.calls[0]?.[1];
    expect(firstRegisterOptions?.signal.aborted).toBe(false);

    unmount();

    expect(firstRegisterOptions?.signal.aborted).toBe(true);
  });

  test("does not register dashboard tools outside signed-in dashboard pages", async () => {
    const registerTool = vi.fn();
    setModelContext({ registerTool });

    mocks.pathname = "/";
    const publicRender = render(<WebMcpProvider />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(registerTool).not.toHaveBeenCalled();
    publicRender.unmount();

    mocks.pathname = "/dashboard";
    mocks.userState = { isLoaded: true, isSignedIn: false };
    render(<WebMcpProvider />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(registerTool).not.toHaveBeenCalled();
  });

  test("uses provideContext when registerTool is unavailable", async () => {
    const provideContext = vi.fn();
    setModelContext({ provideContext });

    render(<WebMcpProvider />);

    await waitFor(() => {
      expect(provideContext).toHaveBeenCalled();
    });

    const provideContextInput = provideContext.mock.calls[0]?.[0];
    expect(provideContextInput?.tools).toHaveLength(11);
    expect(provideContextInput?.tools[0]?.name).toBe(
      "daylily.navigate",
    );
  });

  test("converts plain profile content into EditorJS paragraphs", async () => {
    const registerTool = vi.fn();
    setModelContext({ registerTool });
    mocks.trpcClient.dashboardDb.userProfile.updateContent.mutate.mockResolvedValue({
      id: "profile-1",
    });

    render(<WebMcpProvider />);
    await waitFor(() => {
      expect(registerTool).toHaveBeenCalled();
    });

    const contentTool = registerTool.mock.calls
      .map(([tool]) => tool)
      .find((tool) => tool.name === "daylily.update-profile-content");

    await contentTool.execute({
      content: "First paragraph.\n\nSecond paragraph.",
    });

    const mutationInput =
      mocks.trpcClient.dashboardDb.userProfile.updateContent.mutate.mock
        .calls[0]?.[0];
    const parsed = JSON.parse(mutationInput.content);

    expect(parsed.blocks).toMatchObject([
      { type: "paragraph", data: { text: "First paragraph." } },
      { type: "paragraph", data: { text: "Second paragraph." } },
    ]);
  });

  test("create-listing returns post-mutation listing state", async () => {
    const registerTool = vi.fn();
    setModelContext({ registerTool });
    mocks.insertListing.mockResolvedValue({ id: "listing-1" });
    mocks.trpcClient.dashboardDb.listing.get.query.mockResolvedValue({
      id: "listing-1",
      title: "Updated listing",
      price: 20,
    });

    render(<WebMcpProvider />);
    await waitFor(() => {
      expect(registerTool).toHaveBeenCalled();
    });

    const createListingTool = registerTool.mock.calls
      .map(([tool]) => tool)
      .find((tool) => tool.name === "daylily.create-listing");

    const result = await createListingTool.execute({
      title: "New listing",
      price: 20,
    });

    expect(mocks.trpcClient.dashboardDb.listing.get.query).toHaveBeenCalledWith({
      id: "listing-1",
    });
    expect(result.structuredContent).toMatchObject({
      ok: true,
      listing: { id: "listing-1", title: "Updated listing", price: 20 },
    });
  });

  test("write tools reject invalid and negative numeric input", async () => {
    const registerTool = vi.fn();
    setModelContext({ registerTool });
    mocks.insertListing.mockResolvedValue({ id: "listing-1" });

    render(<WebMcpProvider />);
    await waitFor(() => {
      expect(registerTool).toHaveBeenCalled();
    });

    const createListingTool = registerTool.mock.calls
      .map(([tool]) => tool)
      .find((tool) => tool.name === "daylily.create-listing");

    await expect(
      createListingTool.execute({
        title: "New listing",
        price: "not a number",
      }),
    ).rejects.toThrow("finite number");
    await expect(
      createListingTool.execute({
        title: "New listing",
        price: -10,
      }),
    ).rejects.toThrow("greater than or equal to 0");
    expect(mocks.insertListing).not.toHaveBeenCalled();
  });

  test("advertises clearable nullable write fields", async () => {
    const registerTool = vi.fn();
    setModelContext({ registerTool });

    render(<WebMcpProvider />);
    await waitFor(() => {
      expect(registerTool).toHaveBeenCalled();
    });

    const tools = registerTool.mock.calls.map(([tool]) => tool);
    const updateProfileTool = tools.find(
      (tool) => tool.name === "daylily.update-profile",
    );
    const updateListingTool = tools.find(
      (tool) => tool.name === "daylily.update-listing",
    );

    expect(updateProfileTool.inputSchema.properties).toMatchObject({
      description: { type: ["string", "null"] },
      location: { type: ["string", "null"] },
      logoUrl: { type: ["string", "null"] },
    });
    expect(updateListingTool.inputSchema.properties).toMatchObject({
      description: { type: ["string", "null"] },
      price: { type: ["number", "null"] },
      privateNote: { type: ["string", "null"] },
    });
  });
});
