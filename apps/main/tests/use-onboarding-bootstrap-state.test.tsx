import { act, renderHook, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RouterOutputs } from "@/trpc/react";
import { ONBOARDING_LISTING_DEFAULTS } from "@/app/start-onboarding/onboarding-utils";
import { useOnboardingBootstrapState } from "@/app/start-onboarding/use-onboarding-bootstrap-state";

type HookArgs = Parameters<typeof useOnboardingBootstrapState>[0];
type DashboardImage = RouterOutputs["dashboardDb"]["image"]["list"][number];
type DashboardListing = RouterOutputs["dashboardDb"]["listing"]["list"][number];
type DashboardProfile = RouterOutputs["dashboardDb"]["userProfile"]["get"];

interface RenderOverrides {
  currentUserEmail?: string | null;
  currentUserId?: string | null;
  images?: DashboardImage[];
  initialListingDraft?: HookArgs["listingDraft"];
  initialProfileDraft?: HookArgs["profileDraft"];
  initialSavedListingId?: string | null;
  listings?: DashboardListing[];
  profile?: DashboardProfile;
  profileUserId?: string | null;
}

function createListing(
  overrides: Partial<DashboardListing> = {},
): DashboardListing {
  return {
    id: "listing-1",
    title: "Starter Listing",
    price: 12,
    description: "Starter description",
    cultivarReferenceId: "cultivar-1",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  } as DashboardListing;
}

function createImage(overrides: Partial<DashboardImage> = {}): DashboardImage {
  return {
    id: "image-1",
    url: "https://example.com/image-1.jpg",
    key: "image-1",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    listingId: null,
    userProfileId: null,
    ...overrides,
  } as DashboardImage;
}

function renderBootstrapHook(overrides: RenderOverrides = {}) {
  return renderHook(() => {
    const [profileDraft, setProfileDraft] = useState(
      overrides.initialProfileDraft ?? {
        gardenName: "",
        location: "",
        description: "",
        profileImageUrl: null,
      },
    );
    const [listingDraft, setListingDraft] = useState(
      overrides.initialListingDraft ?? {
        cultivarReferenceId: null,
        title: "",
        price: null,
        description: "",
        status: ONBOARDING_LISTING_DEFAULTS.defaultStatus,
      },
    );
    const [savedListingId, setSavedListingId] = useState<string | null>(
      overrides.initialSavedListingId ?? null,
    );
    const [selectedCultivarAhsId, setSelectedCultivarAhsId] = useState<
      string | null
    >(null);
    const [selectedCultivarName, setSelectedCultivarName] = useState<
      string | null
    >(null);
    const [selectedListingImageId, setSelectedListingImageId] = useState<
      string | null
    >(null);
    const [selectedListingImageUrl, setSelectedListingImageUrl] = useState<
      string | null
    >(null);

    const bootstrapState = useOnboardingBootstrapState({
      currentUserEmail: overrides.currentUserEmail,
      currentUserId: overrides.currentUserId,
      images: overrides.images,
      listingDraft,
      listings: overrides.listings,
      profile: overrides.profile,
      profileDraft,
      profileUserId: overrides.profileUserId,
      savedListingId,
      selectedCultivarAhsId,
      selectedCultivarName,
      setListingDraft,
      setProfileDraft,
      setSavedListingId,
      setSelectedCultivarAhsId,
      setSelectedCultivarName,
      setSelectedListingImageId,
      setSelectedListingImageUrl,
    });

    return {
      ...bootstrapState,
      listingDraft,
      profileDraft,
      savedListingId,
      selectedCultivarAhsId,
      selectedCultivarName,
      selectedListingImageId,
      selectedListingImageUrl,
    };
  });
}

describe("useOnboardingBootstrapState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("hydrates and sanitizes the scoped onboarding draft snapshot", async () => {
    const scopedKey = "start-onboarding:draft-v1:user%40example.com";
    window.sessionStorage.setItem("start-onboarding:draft-v1", "legacy");
    window.sessionStorage.setItem(
      scopedKey,
      JSON.stringify({
        profileDraft: {
          gardenName: "Mesa Daylilies",
          location: "Denver, CO",
          description: "Ships in spring.",
          profileImageUrl: "blob:temporary-preview",
        },
        listingDraft: {
          cultivarReferenceId: "cultivar-1",
          title: "Coffee Frenzy fan",
          price: 18,
          description: "Healthy dormant fan",
          status: null,
        },
        selectedCultivarName: "Coffee Frenzy",
        selectedCultivarAhsId: "ahs-1",
      }),
    );

    const { result } = renderBootstrapHook({
      currentUserEmail: "user@example.com",
    });

    await waitFor(() => {
      expect(result.current.profileDraft.gardenName).toBe("Mesa Daylilies");
    });

    expect(result.current.profileDraft.profileImageUrl).toBeNull();
    expect(result.current.listingDraft.status).toBe(
      ONBOARDING_LISTING_DEFAULTS.defaultStatus,
    );
    expect(result.current.selectedCultivarName).toBe("Coffee Frenzy");
    expect(result.current.selectedCultivarAhsId).toBe("ahs-1");

    const persistedSnapshotRaw: unknown = JSON.parse(
      window.sessionStorage.getItem(scopedKey) ?? "{}",
    );
    const persistedSnapshot = persistedSnapshotRaw as {
      profileDraft?: { profileImageUrl: string | null };
    };

    expect(persistedSnapshot.profileDraft?.profileImageUrl).toBeNull();

    act(() => {
      result.current.clearOnboardingDraftSnapshot();
    });

    expect(window.sessionStorage.getItem("start-onboarding:draft-v1")).toBeNull();
    expect(window.sessionStorage.getItem(scopedKey)).toBeNull();
  });

  it("hydrates the earliest listing and its earliest persisted image", async () => {
    const earliestListing = createListing({
      id: "listing-early",
      title: "Earlier Listing",
      price: 22,
      description: "Earlier description",
      cultivarReferenceId: "cultivar-early",
      createdAt: new Date("2024-01-05T00:00:00.000Z"),
    });
    const laterListing = createListing({
      id: "listing-late",
      title: "Later Listing",
      createdAt: new Date("2024-03-05T00:00:00.000Z"),
    });

    const earliestImage = createImage({
      id: "image-early",
      listingId: "listing-early",
      url: "https://example.com/early.jpg",
      createdAt: new Date("2024-01-06T00:00:00.000Z"),
    });
    const laterImage = createImage({
      id: "image-late",
      listingId: "listing-early",
      url: "https://example.com/later.jpg",
      createdAt: new Date("2024-02-06T00:00:00.000Z"),
    });

    const { result } = renderBootstrapHook({
      images: [laterImage, earliestImage],
      listings: [laterListing, earliestListing],
    });

    await waitFor(() => {
      expect(result.current.savedListingId).toBe("listing-early");
    });

    expect(result.current.listingDraft.title).toBe("Earlier Listing");
    expect(result.current.listingDraft.price).toBe(22);

    await waitFor(() => {
      expect(result.current.selectedListingImageId).toBe("image-early");
    });

    expect(result.current.selectedListingImageUrl).toBe(
      "https://example.com/early.jpg",
    );
  });
});
