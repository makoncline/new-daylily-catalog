import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  trpcClient: {
    dashboardDb: {
      ahs: {
        search: { query: vi.fn() },
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
  push: vi.fn(),
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
  useRouter: () => ({ push: mocks.push }),
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
      "daylily.create-listing",
      "daylily.update-listing",
      "daylily.link-cultivar",
      "daylily.create-list",
      "daylily.open-image-editor",
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
    expect(provideContextInput?.tools).toHaveLength(10);
    expect(provideContextInput?.tools[0]?.name).toBe("daylily.navigate");
  });

  test("ignores duplicate tool registration errors on dashboard rerenders", async () => {
    const registeredToolNames = new Set<string>();
    const registerTool = vi.fn((tool: { name: string }) => {
      if (registeredToolNames.has(tool.name)) {
        throw new DOMException(
          "Failed to execute 'registerTool' on 'ModelContext': Duplicate tool name",
          "InvalidStateError",
        );
      }
      registeredToolNames.add(tool.name);
    });
    setModelContext({ registerTool });

    const { rerender } = render(<WebMcpProvider />);
    await waitFor(() => {
      expect(registerTool).toHaveBeenCalledTimes(10);
    });

    mocks.pathname = "/dashboard/listings";
    rerender(<WebMcpProvider />);

    await waitFor(() => {
      expect(registerTool).toHaveBeenCalledTimes(20);
    });
    expect(registeredToolNames.size).toBe(10);
  });

  test("does not crash the dashboard when registerTool throws", async () => {
    const registerTool = vi.fn(() => {
      throw new Error("host WebMCP registration failed");
    });
    setModelContext({ registerTool });

    render(<WebMcpProvider />);

    await waitFor(() => {
      expect(registerTool).toHaveBeenCalledTimes(10);
    });
  });

  test("does not crash the dashboard when provideContext throws", async () => {
    const provideContext = vi.fn(() => {
      throw new Error("host WebMCP context failed");
    });
    setModelContext({ provideContext });

    render(<WebMcpProvider />);

    await waitFor(() => {
      expect(provideContext).toHaveBeenCalled();
    });
  });

  test("create-listing returns post-mutation listing state", async () => {
    const registerTool = vi.fn();
    setModelContext({ registerTool });
    mocks.insertListing.mockResolvedValue({
      id: "listing-1",
      updatedAt: new Date("2026-09-25T12:00:00.000Z"),
    });
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

    expect(mocks.trpcClient.dashboardDb.listing.get.query).toHaveBeenCalledWith(
      {
        id: "listing-1",
      },
    );
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
    });
    expect(updateListingTool.inputSchema.properties).toMatchObject({
      description: { type: ["string", "null"] },
      price: { type: ["number", "null"] },
      privateNote: { type: ["string", "null"] },
    });
  });

  test("keeps listing field edits and cultivar links as separate writes", async () => {
    const registerTool = vi.fn();
    setModelContext({ registerTool });
    mocks.linkAhs.mockResolvedValue({
      id: "listing-1",
      cultivarReferenceId: "cultivar-1",
    });

    render(<WebMcpProvider />);
    await waitFor(() => expect(registerTool).toHaveBeenCalled());

    const tools = registerTool.mock.calls.map(([tool]) => tool);
    const updateListingTool = tools.find(
      (tool) => tool.name === "daylily.update-listing",
    );
    const linkCultivarTool = tools.find(
      (tool) => tool.name === "daylily.link-cultivar",
    );
    expect(updateListingTool.inputSchema.properties).not.toHaveProperty(
      "cultivarReferenceId",
    );

    await expect(
      updateListingTool.execute({
        listingId: "listing-1",
        expectedUpdatedAt: "2026-09-25T12:00:00.000Z",
        title: "New title",
        cultivarReferenceId: "cultivar-1",
      }),
    ).rejects.toThrow("Use daylily.link-cultivar");
    expect(mocks.linkAhs).not.toHaveBeenCalled();
    expect(mocks.updateListing).not.toHaveBeenCalled();

    await linkCultivarTool.execute({
      listingId: "listing-1",
      cultivarReferenceId: "cultivar-1",
      syncName: true,
    });
    expect(mocks.linkAhs).toHaveBeenCalledWith({
      id: "listing-1",
      cultivarReferenceId: "cultivar-1",
      syncName: true,
    });
    expect(mocks.updateListing).not.toHaveBeenCalled();
  });

  test("opens owned image editors and rejects a foreign listing", async () => {
    const registerTool = vi.fn();
    setModelContext({ registerTool });
    mocks.trpcClient.dashboardDb.listing.get.query.mockResolvedValue({
      id: "listing-1",
    });
    render(<WebMcpProvider />);
    await waitFor(() => expect(registerTool).toHaveBeenCalled());
    const tools = registerTool.mock.calls.map(([tool]) => tool);
    expect(
      tools.some(
        (tool) =>
          tool.name === "daylily.prepare-image-upload" ||
          tool.name === "daylily.attach-uploaded-image",
      ),
    ).toBe(false);
    const imageEditor = tools.find(
      (tool) => tool.name === "daylily.open-image-editor",
    );
    await imageEditor.execute({ type: "listing", listingId: "listing-1" });
    expect(mocks.push).toHaveBeenLastCalledWith(
      "/dashboard/listings?editing=listing-1#listing-images",
    );
    await imageEditor.execute({ type: "profile" });
    expect(mocks.push).toHaveBeenLastCalledWith(
      "/dashboard/profile#profile-images",
    );
    mocks.push.mockClear();
    mocks.trpcClient.dashboardDb.listing.get.query.mockRejectedValueOnce(
      new Error("Listing not found"),
    );
    await expect(
      imageEditor.execute({ type: "listing", listingId: "foreign" }),
    ).rejects.toThrow("Listing not found");
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
