import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { UserDataProvider, useUserData } from "../user-data-context";

// Mock the reportError function
vi.mock("@/lib/error-utils", () => ({
  reportError: vi.fn(),
  // Add proper typing to the tryCatch mock
  tryCatch: vi
    .fn()
    .mockImplementation((fn: Promise<unknown> | (() => Promise<unknown>)) => {
      const promise = typeof fn === "function" ? fn() : fn;
      return promise
        .then((data: unknown) => ({ data, error: null }))
        .catch((error: Error) => ({ data: null, error }));
    }),
}));

// Import the mocked reportError function
import { reportError } from "@/lib/error-utils";

// Create a simplified mock module
vi.mock("@/trpc/react", () => {
  // Mock query results
  const mockListing = {
    id: "listing1",
    userId: "user1",
    title: "Test Daylily",
    slug: "test-daylily",
    price: 1999,
    description: "A test daylily",
    ahsId: "ahs1",
    status: "VISIBLE",
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-02"),
    privateNote: "Test note",
  };

  const mockAhsData = {
    id: "ahs1",
    name: "AHS Test Daylily",
    hybridizer: "Test Hybridizer",
    color: "Red",
    year: "2020",
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-02"),
  };

  const mockImage = {
    id: "image1",
    listingId: "listing1",
    url: "https://example.com/test.jpg",
    order: 1,
    status: "VISIBLE",
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-02"),
  };

  const mockList = {
    id: "list1",
    title: "Test List",
    description: "A test list",
    status: "VISIBLE",
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-02"),
    listings: [{ id: "listing1" }],
  };

  // Create a map to store mock fetched listings with modified versions of existing mocks
  const mockFetchedListings = {
    listing2: {
      ...mockListing,
      id: "listing2",
      ahsListing: {
        ...mockAhsData,
      },
      images: [mockImage],
      lists: [mockList],
    },
    // Add an updated version of listing1 for our update test
    listing1: {
      ...mockListing,
      title: "Updated Daylily",
      price: 2599,
      ahsListing: {
        ...mockAhsData,
        name: "Updated AHS Daylily",
        hybridizer: "Updated Hybridizer",
      },
      images: [
        {
          ...mockImage,
          url: "https://example.com/updated.jpg",
        },
      ],
      lists: [
        {
          ...mockList,
          title: "Updated List",
          description: "An updated list",
        },
      ],
    },
  };

  // Create functions for mocks
  const mockUseQuery = (mockData: unknown[]) => () => ({
    data: mockData,
    isLoading: false,
    isSuccess: true,
  });

  // Mock fetch function for getSingleListing
  const mockFetch = vi.fn().mockImplementation(({ id }: { id: string }) => {
    return Promise.resolve(
      mockFetchedListings[id as keyof typeof mockFetchedListings] || null,
    );
  });

  // Mock setData functions for updating caches
  const mockSetData = vi.fn();

  // Return the mock module
  return {
    api: {
      useUtils: () => ({
        dashboard: {
          getBaseListings: { setData: mockSetData },
          getAhsListings: { setData: mockSetData },
          getUserImages: { setData: mockSetData },
          getListsAndEntries: { setData: mockSetData },
          getSingleListing: { fetch: mockFetch },
        },
        listing: {
          get: { setData: mockSetData },
        },
      }),
      dashboard: {
        getBaseListings: {
          useQuery: mockUseQuery([mockListing]),
        },
        getAhsListings: {
          useQuery: mockUseQuery([mockAhsData]),
        },
        getUserImages: {
          useQuery: mockUseQuery([mockImage]),
        },
        getListsAndEntries: {
          useQuery: mockUseQuery([mockList]),
        },
      },
    },
  };
});

// Import mock functions for assertions
import { api } from "@/trpc/react";

describe("UserDataContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should combine data from different sources into a single context listing", async () => {
    // Render the hook with the UserDataProvider
    const { result } = renderHook(() => useUserData(), {
      wrapper: ({ children }) => (
        <UserDataProvider>{children}</UserDataProvider>
      ),
    });

    // Wait for all data to be loaded and combined
    await waitFor(() => {
      expect(result.current.listings).toHaveLength(1);
    });

    // Extract the test listing
    const contextListing = result.current.listings[0];

    // Verify the combined data is defined
    expect(contextListing).toBeDefined();

    // Only proceed with deeper checks if contextListing is defined
    if (contextListing) {
      // Verify base listing data
      expect(contextListing.id).toBe("listing1");
      expect(contextListing.title).toBe("Test Daylily");

      // Verify AHS data was combined correctly
      expect(contextListing.ahsListing).toBeDefined();
      if (contextListing.ahsListing) {
        expect(contextListing.ahsListing.id).toBe("ahs1");
        expect(contextListing.ahsListing.name).toBe("AHS Test Daylily");
      }

      // Verify images were combined correctly
      expect(contextListing.images).toHaveLength(1);
      if (contextListing.images.length > 0) {
        const image = contextListing.images[0];
        expect(image?.id).toBe("image1");
        expect(image?.url).toBe("https://example.com/test.jpg");
      }

      // Verify lists were combined correctly
      expect(contextListing.lists).toHaveLength(1);
      if (contextListing.lists.length > 0) {
        const list = contextListing.lists[0];
        expect(list?.id).toBe("list1");
        expect(list?.title).toBe("Test List");
      }
    }

    // Verify loading states
    expect(result.current.isLoadingBaseListingData).toBe(false);
    expect(result.current.isLoadingFullListingData).toBe(false);
  });

  it("should fetch and add a listing when there are no listings initially", async () => {
    // Override the mock return values for this test to have empty initial data
    const emptyDataMocks = {
      dashboard: {
        getBaseListings: {
          useQuery: () => ({
            data: [],
            isLoading: false,
            isSuccess: true,
          }),
        },
        getAhsListings: {
          useQuery: () => ({
            data: [],
            isLoading: false,
            isSuccess: true,
          }),
        },
        getUserImages: {
          useQuery: () => ({
            data: [],
            isLoading: false,
            isSuccess: true,
          }),
        },
        getListsAndEntries: {
          useQuery: () => ({
            data: [],
            isLoading: false,
            isSuccess: true,
          }),
        },
      },
    };

    // Apply the empty data mocks
    Object.assign(api.dashboard, emptyDataMocks.dashboard);

    // Get the fetch and setData functions to check if they're called
    const utilsObject = api.useUtils();
    // Ignore linter warnings about unbound methods as we're testing specific functions
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const fetchSpy = utilsObject.dashboard.getSingleListing.fetch;

    // Render the hook with the UserDataProvider
    const { result } = renderHook(() => useUserData(), {
      wrapper: ({ children }) => (
        <UserDataProvider>{children}</UserDataProvider>
      ),
    });

    // Verify initial state has no listings
    await waitFor(() => {
      expect(result.current.listings).toHaveLength(0);
    });

    // Call addListingToCache
    await act(async () => {
      await result.current.addListingToCache("listing2");
    });

    // Verify the fetch was called with the correct ID
    expect(fetchSpy).toHaveBeenCalledWith({ id: "listing2" });

    // Verify cache updates were called with the listing data
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setDataSpy = utilsObject.dashboard.getBaseListings.setData;
    expect(setDataSpy).toHaveBeenCalled();

    // Verify that after the call, we should have a mocked response from the context
    // Note: Since we're mocking at the module level, we don't actually update the context state
    // in the test. In a real scenario, the state would update. Here we're just verifying
    // that the right functions were called with the right arguments.
  });

  it("should update a listing when it already exists in the cache", async () => {
    // Set up mock data for this specific test
    // First reset the dashboard API mocks
    Object.assign(api.dashboard, {
      getBaseListings: {
        useQuery: () => ({
          data: [
            {
              id: "listing1",
              userId: "user1",
              title: "Test Daylily",
              slug: "test-daylily",
              price: 1999,
              description: "A test daylily",
              ahsId: "ahs1",
              status: "VISIBLE",
              createdAt: new Date("2023-01-01"),
              updatedAt: new Date("2023-01-02"),
              privateNote: "Test note",
            },
          ],
          isLoading: false,
          isSuccess: true,
        }),
      },
      getAhsListings: {
        useQuery: () => ({
          data: [
            {
              id: "ahs1",
              name: "AHS Test Daylily",
              hybridizer: "Test Hybridizer",
              color: "Red",
              year: "2020",
              createdAt: new Date("2023-01-01"),
              updatedAt: new Date("2023-01-02"),
            },
          ],
          isLoading: false,
          isSuccess: true,
        }),
      },
      getUserImages: {
        useQuery: () => ({
          data: [
            {
              id: "image1",
              listingId: "listing1",
              url: "https://example.com/test.jpg",
              order: 1,
              status: "VISIBLE",
              createdAt: new Date("2023-01-01"),
              updatedAt: new Date("2023-01-02"),
            },
          ],
          isLoading: false,
          isSuccess: true,
        }),
      },
      getListsAndEntries: {
        useQuery: () => ({
          data: [
            {
              id: "list1",
              title: "Test List",
              description: "A test list",
              status: "VISIBLE",
              createdAt: new Date("2023-01-01"),
              updatedAt: new Date("2023-01-02"),
              listings: [{ id: "listing1" }],
            },
          ],
          isLoading: false,
          isSuccess: true,
        }),
      },
    });

    // Render the hook with the UserDataProvider
    const { result } = renderHook(() => useUserData(), {
      wrapper: ({ children }) => (
        <UserDataProvider>{children}</UserDataProvider>
      ),
    });

    // Wait for initial data to be loaded - should have one listing
    await waitFor(() => {
      expect(result.current.listings).toHaveLength(1);
    });

    // Verify initial state of the listing before update
    const contextListing = result.current.listings[0];
    if (contextListing) {
      expect(contextListing.title).toBe("Test Daylily");
      expect(contextListing.price).toBe(1999);

      if (contextListing.ahsListing) {
        expect(contextListing.ahsListing.name).toBe("AHS Test Daylily");
        expect(contextListing.ahsListing.hybridizer).toBe("Test Hybridizer");
      }

      if (contextListing.images && contextListing.images.length > 0) {
        expect(contextListing.images[0]?.url).toBe(
          "https://example.com/test.jpg",
        );
      }

      if (contextListing.lists && contextListing.lists.length > 0) {
        expect(contextListing.lists[0]?.title).toBe("Test List");
        expect(contextListing.lists[0]?.description).toBe("A test list");
      }
    }

    // Get the utils and spy on the fetch method
    const utilsObject = api.useUtils();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const fetchSpy = utilsObject.dashboard.getSingleListing
      .fetch as unknown as Mock;

    // Override the fetch to return our updated listing
    fetchSpy.mockResolvedValueOnce({
      id: "listing1",
      title: "Updated Daylily",
      price: 2599,
      ahsId: "ahs1",
      ahsListing: {
        id: "ahs1",
        name: "Updated AHS Daylily",
        hybridizer: "Updated Hybridizer",
      },
      images: [
        {
          id: "image1",
          url: "https://example.com/updated.jpg",
        },
      ],
      lists: [
        {
          id: "list1",
          title: "Updated List",
          description: "An updated list",
        },
      ],
    });

    // Call addListingToCache to update the existing listing
    await act(async () => {
      await result.current.addListingToCache("listing1");
    });

    // Verify the fetch was called with the correct ID
    expect(fetchSpy).toHaveBeenCalledWith({ id: "listing1" });

    // Verify cache updates were called
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setBaseDataSpy = utilsObject.dashboard.getBaseListings.setData;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setAhsDataSpy = utilsObject.dashboard.getAhsListings.setData;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setImagesDataSpy = utilsObject.dashboard.getUserImages.setData;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setListsDataSpy = utilsObject.dashboard.getListsAndEntries.setData;

    expect(setBaseDataSpy).toHaveBeenCalled();
    expect(setAhsDataSpy).toHaveBeenCalled();
    expect(setImagesDataSpy).toHaveBeenCalled();
    expect(setListsDataSpy).toHaveBeenCalled();
  });

  it("should add joins to a listing that initially has none", async () => {
    // Set up mock data with a listing that has no joins
    Object.assign(api.dashboard, {
      getBaseListings: {
        useQuery: () => ({
          data: [
            {
              id: "listing3",
              userId: "user1",
              title: "Standalone Daylily",
              slug: "standalone-daylily",
              price: 1599,
              description: "A daylily with no associations",
              // No ahsId field initially
              status: "VISIBLE",
              createdAt: new Date("2023-01-01"),
              updatedAt: new Date("2023-01-02"),
              privateNote: "No associations",
            },
          ],
          isLoading: false,
          isSuccess: true,
        }),
      },
      getAhsListings: {
        useQuery: () => ({
          data: [], // No AHS data initially
          isLoading: false,
          isSuccess: true,
        }),
      },
      getUserImages: {
        useQuery: () => ({
          data: [], // No images initially
          isLoading: false,
          isSuccess: true,
        }),
      },
      getListsAndEntries: {
        useQuery: () => ({
          data: [
            {
              id: "list1",
              title: "Test List",
              description: "A test list",
              status: "VISIBLE",
              createdAt: new Date("2023-01-01"),
              updatedAt: new Date("2023-01-02"),
              listings: [], // No listings in this list initially
            },
          ],
          isLoading: false,
          isSuccess: true,
        }),
      },
    });

    // Render the hook with the UserDataProvider
    const { result } = renderHook(() => useUserData(), {
      wrapper: ({ children }) => (
        <UserDataProvider>{children}</UserDataProvider>
      ),
    });

    // Wait for initial data to be loaded - should have one listing
    await waitFor(() => {
      expect(result.current.listings).toHaveLength(1);
    });

    // Verify initial state of the listing before update
    const initialListing = result.current.listings[0];
    if (initialListing) {
      expect(initialListing.title).toBe("Standalone Daylily");
      expect(initialListing.ahsId).toBeUndefined(); // No AHS ID initially
      expect(initialListing.ahsListing).toBeNull(); // No AHS listing initially (represented as null, not undefined)
      expect(initialListing.images).toHaveLength(0); // No images initially
      expect(initialListing.lists).toHaveLength(0); // No lists initially
    }

    // Get the utils and spy on the fetch method
    const utilsObject = api.useUtils();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const fetchSpy = utilsObject.dashboard.getSingleListing
      .fetch as unknown as Mock;

    // Create an updated version with all joins
    const updatedListing = {
      id: "listing3",
      userId: "user1",
      title: "Standalone Daylily",
      slug: "standalone-daylily",
      price: 1599,
      description: "A daylily with no associations",
      ahsId: "ahs2", // Now has an AHS ID
      status: "VISIBLE",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-02"),
      privateNote: "No associations",
      // Now has related data
      ahsListing: {
        id: "ahs2",
        name: "New AHS Daylily",
        hybridizer: "New Hybridizer",
        color: "Purple",
        year: "2019",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
      },
      images: [
        {
          id: "image2",
          listingId: "listing3",
          url: "https://example.com/new.jpg",
          order: 1,
          status: "VISIBLE",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-02"),
        },
      ],
      lists: [
        {
          id: "list1",
          title: "Test List",
          description: "A test list",
          status: "VISIBLE",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-02"),
        },
      ],
    };

    // Override the fetch to return our updated listing with joins
    fetchSpy.mockResolvedValueOnce(updatedListing);

    // Call addListingToCache to update the existing listing
    await act(async () => {
      await result.current.addListingToCache("listing3");
    });

    // Verify the fetch was called with the correct ID
    expect(fetchSpy).toHaveBeenCalledWith({ id: "listing3" });

    // Verify cache updates were called
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setBaseDataSpy = utilsObject.dashboard.getBaseListings.setData;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setAhsDataSpy = utilsObject.dashboard.getAhsListings.setData;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setImagesDataSpy = utilsObject.dashboard.getUserImages.setData;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setListsDataSpy = utilsObject.dashboard.getListsAndEntries.setData;

    // Verify that all relevant caches were updated
    expect(setBaseDataSpy).toHaveBeenCalled(); // Base listing updated with ahsId
    expect(setAhsDataSpy).toHaveBeenCalled(); // AHS data added
    expect(setImagesDataSpy).toHaveBeenCalled(); // Image added
    expect(setListsDataSpy).toHaveBeenCalled(); // List updated with new listing
  });

  it("should remove joins from a listing that initially has associations", async () => {
    // Set up mock data with a listing that has all joins
    Object.assign(api.dashboard, {
      getBaseListings: {
        useQuery: () => ({
          data: [
            {
              id: "listing4",
              userId: "user1",
              title: "Full Daylily",
              slug: "full-daylily",
              price: 2499,
              description: "A daylily with all associations",
              ahsId: "ahs4", // Has AHS ID initially
              status: "VISIBLE",
              createdAt: new Date("2023-01-01"),
              updatedAt: new Date("2023-01-02"),
              privateNote: "Has all associations",
            },
          ],
          isLoading: false,
          isSuccess: true,
        }),
      },
      getAhsListings: {
        useQuery: () => ({
          data: [
            {
              id: "ahs4",
              name: "Full AHS Daylily",
              hybridizer: "Full Hybridizer",
              color: "Gold",
              year: "2018",
              createdAt: new Date("2023-01-01"),
              updatedAt: new Date("2023-01-02"),
            },
          ],
          isLoading: false,
          isSuccess: true,
        }),
      },
      getUserImages: {
        useQuery: () => ({
          data: [
            {
              id: "image4",
              listingId: "listing4",
              url: "https://example.com/full.jpg",
              order: 1,
              status: "VISIBLE",
              createdAt: new Date("2023-01-01"),
              updatedAt: new Date("2023-01-02"),
            },
          ],
          isLoading: false,
          isSuccess: true,
        }),
      },
      getListsAndEntries: {
        useQuery: () => ({
          data: [
            {
              id: "list4",
              title: "Full List",
              description: "A full list",
              status: "VISIBLE",
              createdAt: new Date("2023-01-01"),
              updatedAt: new Date("2023-01-02"),
              listings: [{ id: "listing4" }], // Has this listing in the list
            },
          ],
          isLoading: false,
          isSuccess: true,
        }),
      },
    });

    // Render the hook with the UserDataProvider
    const { result } = renderHook(() => useUserData(), {
      wrapper: ({ children }) => (
        <UserDataProvider>{children}</UserDataProvider>
      ),
    });

    // Wait for initial data to be loaded - should have one listing
    await waitFor(() => {
      expect(result.current.listings).toHaveLength(1);
    });

    // Verify initial state of the listing before update
    const initialListing = result.current.listings[0];
    if (initialListing) {
      expect(initialListing.title).toBe("Full Daylily");
      expect(initialListing.ahsId).toBe("ahs4"); // Has AHS ID initially
      expect(initialListing.ahsListing).not.toBeNull(); // Has AHS data initially
      expect(initialListing.images).toHaveLength(1); // Has one image initially
      expect(initialListing.lists).toHaveLength(1); // Has one list initially
    }

    // Get the utils and spy on the fetch method
    const utilsObject = api.useUtils();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const fetchSpy = utilsObject.dashboard.getSingleListing
      .fetch as unknown as Mock;

    // Create an updated version with all joins removed
    const updatedListing = {
      id: "listing4",
      userId: "user1",
      title: "Full Daylily",
      slug: "full-daylily",
      price: 2499,
      description: "A daylily with all associations",
      // No ahsId field now
      status: "VISIBLE",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-02"),
      privateNote: "Has all associations",
      // Empty related data
      ahsListing: null,
      images: [],
      lists: [],
    };

    // Override the fetch to return our updated listing with joins removed
    fetchSpy.mockResolvedValueOnce(updatedListing);

    // Call addListingToCache to update the existing listing
    await act(async () => {
      await result.current.addListingToCache("listing4");
    });

    // Verify the fetch was called with the correct ID
    expect(fetchSpy).toHaveBeenCalledWith({ id: "listing4" });

    // Verify cache updates were called
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setBaseDataSpy = utilsObject.dashboard.getBaseListings.setData;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setAhsDataSpy = utilsObject.dashboard.getAhsListings.setData;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setImagesDataSpy = utilsObject.dashboard.getUserImages.setData;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setListsDataSpy = utilsObject.dashboard.getListsAndEntries.setData;

    // Verify that all relevant caches were updated
    expect(setBaseDataSpy).toHaveBeenCalled(); // Base listing updated (ahsId removed)
    expect(setAhsDataSpy).toHaveBeenCalled(); // AHS data associations updated
    expect(setImagesDataSpy).toHaveBeenCalled(); // Images associations updated
    expect(setListsDataSpy).toHaveBeenCalled(); // Lists associations updated
  });

  it("should remove a listing from all caches when removeListingFromCache is called", async () => {
    // Set up mock data with a listing that has all joins
    Object.assign(api.dashboard, {
      getBaseListings: {
        useQuery: () => ({
          data: [
            {
              id: "listing5",
              userId: "user1",
              title: "Removal Test Daylily",
              slug: "removal-test-daylily",
              price: 1799,
              description: "A daylily to be removed",
              ahsId: "ahs5",
              status: "VISIBLE",
              createdAt: new Date("2023-01-01"),
              updatedAt: new Date("2023-01-02"),
              privateNote: "To be removed",
            },
          ],
          isLoading: false,
          isSuccess: true,
        }),
      },
      getAhsListings: {
        useQuery: () => ({
          data: [
            {
              id: "ahs5",
              name: "Removal AHS Daylily",
              hybridizer: "Removal Hybridizer",
              color: "Blue",
              year: "2021",
              createdAt: new Date("2023-01-01"),
              updatedAt: new Date("2023-01-02"),
            },
          ],
          isLoading: false,
          isSuccess: true,
        }),
      },
      getUserImages: {
        useQuery: () => ({
          data: [
            {
              id: "image5",
              listingId: "listing5",
              url: "https://example.com/removal.jpg",
              order: 1,
              status: "VISIBLE",
              createdAt: new Date("2023-01-01"),
              updatedAt: new Date("2023-01-02"),
            },
          ],
          isLoading: false,
          isSuccess: true,
        }),
      },
      getListsAndEntries: {
        useQuery: () => ({
          data: [
            {
              id: "list5",
              title: "Removal List",
              description: "A list with the listing to be removed",
              status: "VISIBLE",
              createdAt: new Date("2023-01-01"),
              updatedAt: new Date("2023-01-02"),
              listings: [{ id: "listing5" }],
            },
          ],
          isLoading: false,
          isSuccess: true,
        }),
      },
    });

    // Render the hook with the UserDataProvider
    const { result } = renderHook(() => useUserData(), {
      wrapper: ({ children }) => (
        <UserDataProvider>{children}</UserDataProvider>
      ),
    });

    // Wait for initial data to be loaded - should have one listing
    await waitFor(() => {
      expect(result.current.listings).toHaveLength(1);
    });

    // Verify initial state before removal
    const initialListing = result.current.listings[0];
    if (initialListing) {
      expect(initialListing.id).toBe("listing5");
      expect(initialListing.title).toBe("Removal Test Daylily");
    }

    // Get the utils and spy on the setData methods
    const utilsObject = api.useUtils();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setBaseDataSpy = utilsObject.dashboard.getBaseListings
      .setData as unknown as Mock;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setAhsDataSpy = utilsObject.dashboard.getAhsListings
      .setData as unknown as Mock;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setImagesDataSpy = utilsObject.dashboard.getUserImages
      .setData as unknown as Mock;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setListsDataSpy = utilsObject.dashboard.getListsAndEntries
      .setData as unknown as Mock;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setListingGetSpy = utilsObject.listing.get.setData as unknown as Mock;

    // Call removeListingFromCache
    await act(async () => {
      result.current.removeListingFromCache("listing5");
    });

    // Verify that all relevant cache updates were called
    expect(setBaseDataSpy).toHaveBeenCalled(); // Base listing cache updated
    expect(setAhsDataSpy).toHaveBeenCalled(); // AHS data cache updated
    expect(setImagesDataSpy).toHaveBeenCalled(); // Images cache updated
    expect(setListsDataSpy).toHaveBeenCalled(); // Lists cache updated
    expect(setListingGetSpy).toHaveBeenCalled(); // Listing.get cache updated

    // Ideally, we would verify the listing was actually removed from the context's listings
    // But with our mocked implementation, we're primarily testing that the right cache updates
    // were triggered, rather than the actual state updates.
  });

  it("should handle errors when adding a non-existent listing", async () => {
    // Set up empty initial data
    Object.assign(api.dashboard, {
      getBaseListings: {
        useQuery: () => ({
          data: [],
          isLoading: false,
          isSuccess: true,
        }),
      },
      getAhsListings: {
        useQuery: () => ({
          data: [],
          isLoading: false,
          isSuccess: true,
        }),
      },
      getUserImages: {
        useQuery: () => ({
          data: [],
          isLoading: false,
          isSuccess: true,
        }),
      },
      getListsAndEntries: {
        useQuery: () => ({
          data: [],
          isLoading: false,
          isSuccess: true,
        }),
      },
    });

    // Get the fetch spy and make it return null to simulate a non-existent listing
    const utilsObject = api.useUtils();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const fetchSpy = utilsObject.dashboard.getSingleListing
      .fetch as unknown as Mock;
    fetchSpy.mockResolvedValueOnce(null); // Return null as if the listing doesn't exist

    // Reset the reportError mock
    vi.mocked(reportError).mockClear();

    // Render the hook with the UserDataProvider
    const { result } = renderHook(() => useUserData(), {
      wrapper: ({ children }) => (
        <UserDataProvider>{children}</UserDataProvider>
      ),
    });

    // Call addListingToCache with a non-existent ID
    await act(async () => {
      await result.current.addListingToCache("non-existent-id");
    });

    // Verify the fetch was called with the non-existent ID
    expect(fetchSpy).toHaveBeenCalledWith({ id: "non-existent-id" });

    // Verify that reportError was called with the expected parameters
    expect(reportError).toHaveBeenCalledTimes(1);

    const reportErrorCall = vi.mocked(reportError).mock.calls[0]?.[0];
    expect(reportErrorCall).toBeDefined();
    expect(reportErrorCall?.error.message).toContain("Listing not found");
    expect(reportErrorCall?.level).toBe("error");
    expect(reportErrorCall?.context).toEqual({
      listingId: "non-existent-id",
      operation: "addListingToCache",
    });
  });

  it("should refetch all data when refetchAllData is called", async () => {
    // Create spy functions for refetch
    const baseRefetchSpy = vi.fn().mockResolvedValue({ isSuccess: true });
    const ahsRefetchSpy = vi.fn().mockResolvedValue({ isSuccess: true });
    const imagesRefetchSpy = vi.fn().mockResolvedValue({ isSuccess: true });
    const listsRefetchSpy = vi.fn().mockResolvedValue({ isSuccess: true });

    // Set up mock data with a listing
    Object.assign(api.dashboard, {
      getBaseListings: {
        useQuery: () => ({
          data: [
            {
              id: "listing6",
              userId: "user1",
              title: "Refetch Test Daylily",
              slug: "refetch-test-daylily",
              price: 1899,
              description: "A daylily for testing refetch",
              ahsId: "ahs6",
              status: "VISIBLE",
              createdAt: new Date("2023-01-01"),
              updatedAt: new Date("2023-01-02"),
              privateNote: "Test refetch",
            },
          ],
          isLoading: false,
          isSuccess: true,
          refetch: baseRefetchSpy,
        }),
      },
      getAhsListings: {
        useQuery: () => ({
          data: [
            {
              id: "ahs6",
              name: "Refetch AHS Daylily",
              hybridizer: "Refetch Hybridizer",
              color: "Orange",
              year: "2022",
              createdAt: new Date("2023-01-01"),
              updatedAt: new Date("2023-01-02"),
            },
          ],
          isLoading: false,
          isSuccess: true,
          refetch: ahsRefetchSpy,
        }),
      },
      getUserImages: {
        useQuery: () => ({
          data: [
            {
              id: "image6",
              listingId: "listing6",
              url: "https://example.com/refetch.jpg",
              order: 1,
              status: "VISIBLE",
              createdAt: new Date("2023-01-01"),
              updatedAt: new Date("2023-01-02"),
            },
          ],
          isLoading: false,
          isSuccess: true,
          refetch: imagesRefetchSpy,
        }),
      },
      getListsAndEntries: {
        useQuery: () => ({
          data: [
            {
              id: "list6",
              title: "Refetch List",
              description: "A list for testing refetch",
              status: "VISIBLE",
              createdAt: new Date("2023-01-01"),
              updatedAt: new Date("2023-01-02"),
              listings: [{ id: "listing6" }],
            },
          ],
          isLoading: false,
          isSuccess: true,
          refetch: listsRefetchSpy,
        }),
      },
    });

    // Render the hook with the UserDataProvider
    const { result } = renderHook(() => useUserData(), {
      wrapper: ({ children }) => (
        <UserDataProvider>{children}</UserDataProvider>
      ),
    });

    // Wait for initial data to be loaded
    await waitFor(() => {
      expect(result.current.listings).toHaveLength(1);
    });

    // Call refetchAllData
    await act(async () => {
      await result.current.refetchAllData();
    });

    // Verify that all refetch functions were called
    expect(baseRefetchSpy).toHaveBeenCalledTimes(1);
    expect(ahsRefetchSpy).toHaveBeenCalledTimes(1);
    expect(imagesRefetchSpy).toHaveBeenCalledTimes(1);
    expect(listsRefetchSpy).toHaveBeenCalledTimes(1);
  });
});
