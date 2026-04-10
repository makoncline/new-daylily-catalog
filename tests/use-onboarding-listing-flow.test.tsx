import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { useOnboardingListingFlow } from "@/app/start-onboarding/use-onboarding-listing-flow";
import {
  ONBOARDING_LISTING_DEFAULTS,
  type ListingOnboardingDraft,
  type ListingOnboardingField,
} from "@/app/start-onboarding/onboarding-utils";

interface RenderListingFlowOptions
  extends Partial<Parameters<typeof useOnboardingListingFlow>[0]> {
  initialListingDraft?: ListingOnboardingDraft;
}

function renderListingFlow({
  initialListingDraft = {
    cultivarReferenceId: null,
    title: "",
    price: null,
    description: "",
    status: ONBOARDING_LISTING_DEFAULTS.defaultStatus,
  },
  ...overrides
}: RenderListingFlowOptions = {}) {
  return renderHook(() => {
    const [activeListingField, setActiveListingField] =
      useState<ListingOnboardingField>("cultivar");
    const [listingDraft, setListingDraft] =
      useState<ListingOnboardingDraft>(initialListingDraft);
    const [selectedCultivarName, setSelectedCultivarName] = useState<
      string | null
    >(null);
    const [selectedCultivarAhsId, setSelectedCultivarAhsId] = useState<
      string | null
    >(null);
    const [selectedListingImageId, setSelectedListingImageId] = useState<
      string | null
    >(null);
    const [selectedListingImageUrl, setSelectedListingImageUrl] = useState<
      string | null
    >(null);

    const listingFlow = useOnboardingListingFlow({
      ensureListingDraftRecord: vi.fn().mockResolvedValue("listing-1"),
      isListingsFetched: true,
      listingDraft,
      listings: [],
      profileId: "profile-1",
      rawStepParam: null,
      savedListingId: null,
      searchOnboardingCultivars: vi.fn().mockResolvedValue([]),
      selectedCultivarAhsId,
      selectedCultivarName,
      setActiveListingField,
      setListingDraft,
      setSelectedCultivarAhsId,
      setSelectedCultivarName,
      setSelectedListingImageId,
      setSelectedListingImageUrl,
      ...overrides,
    });

    return {
      ...listingFlow,
      activeListingField,
      listingDraft,
      selectedCultivarAhsId,
      selectedCultivarName,
      selectedListingImageId,
      selectedListingImageUrl,
    };
  });
}

describe("useOnboardingListingFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:listing-upload"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  it("loads starter cultivars and applies the preferred default selection", async () => {
    const searchOnboardingCultivars = vi.fn(
      async ({ query }: { query: string }) => {
        if (query === "coffee frenzy") {
          return [
            {
              id: "ahs-coffee",
              name: "Coffee Frenzy",
              cultivarReferenceId: "cultivar-coffee",
            },
          ];
        }

        return [
          {
            id: `ahs-${query}`,
            name: query,
            cultivarReferenceId: `cultivar-${query}`,
          },
        ];
      },
    );

    const { result } = renderListingFlow({
      searchOnboardingCultivars,
    });

    await waitFor(() => {
      expect(result.current.selectedCultivarName).toBe("Coffee Frenzy");
    });

    expect(searchOnboardingCultivars).toHaveBeenCalledTimes(
      ONBOARDING_LISTING_DEFAULTS.onboardingCultivarQueries.length,
    );
    expect(result.current.listingDraft.cultivarReferenceId).toBe(
      "cultivar-coffee",
    );
    expect(result.current.listingDraft.title).toBe("Coffee Frenzy");
    expect(result.current.selectedCultivarAhsId).toBe("ahs-coffee");
    expect(result.current.activeListingField).toBe("price");
    expect(result.current.onboardingCultivarOptions).toHaveLength(
      ONBOARDING_LISTING_DEFAULTS.onboardingCultivarQueries.length,
    );
  });

  it("stores a deferred listing upload preview", () => {
    const file = new Blob(["listing-upload"], { type: "image/png" });
    const { result } = renderListingFlow();

    act(() => {
      result.current.handleDeferredListingImageReady(file);
    });

    expect(result.current.pendingListingUploadBlob).toBe(file);
    expect(result.current.pendingListingUploadPreviewUrl).toBe(
      "blob:listing-upload",
    );
    expect(result.current.selectedListingImageId).toBeNull();
    expect(result.current.selectedListingImageUrl).toBe("blob:listing-upload");
    expect(result.current.activeListingField).toBe("image");
  });

  it("prepares an initial listing draft record on the listing step", async () => {
    const ensureListingDraftRecord = vi.fn().mockResolvedValue("listing-1");

    renderListingFlow({
      ensureListingDraftRecord,
      rawStepParam: "build-listing-card",
    });

    await waitFor(() => {
      expect(ensureListingDraftRecord).toHaveBeenCalledTimes(1);
    });
  });
});
