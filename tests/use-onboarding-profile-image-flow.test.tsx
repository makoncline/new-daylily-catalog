import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { useOnboardingProfileImageFlow } from "@/app/start-onboarding/use-onboarding-profile-image-flow";

function renderProfileImageFlow(
  overrides: Partial<Parameters<typeof useOnboardingProfileImageFlow>[0]> = {},
) {
  return renderHook(() => {
    const [profileDraft, setProfileDraft] = useState({
      gardenName: "",
      location: "",
      description: "",
      profileImageUrl: null as string | null,
    });

    const profileImageFlow = useOnboardingProfileImageFlow({
      defaultStarterImageUrl: "/starter.jpg",
      existingProfileImageUrl: null,
      generateStarterImageWithGardenName: vi.fn().mockResolvedValue({
        blob: new Blob(["starter"], { type: "image/jpeg" }),
        previewUrl: "blob:generated-starter",
      }),
      imagesFetched: false,
      profileDraft,
      profileId: null,
      setProfileDraft,
      ...overrides,
    });

    return {
      ...profileImageFlow,
      profileDraft,
    };
  });
}

describe("useOnboardingProfileImageFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:profile-upload"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  it("adopts an existing uploaded profile image when present", async () => {
    const generateStarterImageWithGardenName = vi.fn().mockResolvedValue({
      blob: new Blob(["starter"], { type: "image/jpeg" }),
      previewUrl: "blob:generated-starter",
    });

    const { result } = renderProfileImageFlow({
      existingProfileImageUrl: "https://example.com/profile.jpg",
      generateStarterImageWithGardenName,
      imagesFetched: true,
      profileId: "profile-1",
    });

    await waitFor(() => {
      expect(result.current.useExistingProfileImage).toBe(true);
    });

    expect(result.current.profileImageInputMode).toBe("upload");
    expect(result.current.selectedStarterImageUrl).toBeNull();
    expect(result.current.profileDraft.profileImageUrl).toBe(
      "https://example.com/profile.jpg",
    );
  });

  it("stores a deferred upload preview and switches to upload mode", () => {
    const file = new Blob(["upload"], { type: "image/png" });
    const { result } = renderProfileImageFlow({
      defaultStarterImageUrl: null,
    });

    act(() => {
      result.current.handleDeferredProfileImageReady(file);
    });

    expect(result.current.pendingProfileUploadBlob).toBe(file);
    expect(result.current.pendingProfileUploadPreviewUrl).toBe(
      "blob:profile-upload",
    );
    expect(result.current.profileImageInputMode).toBe("upload");
    expect(result.current.useExistingProfileImage).toBe(false);
    expect(result.current.profileDraft.profileImageUrl).toBe(
      "blob:profile-upload",
    );
  });

  it("uses the raw starter image when overlay stamping is turned off", async () => {
    const generateStarterImageWithGardenName = vi.fn().mockResolvedValue({
      blob: new Blob(["starter"], { type: "image/jpeg" }),
      previewUrl: "blob:generated-starter",
    });
    const { result } = renderProfileImageFlow({
      defaultStarterImageUrl: null,
      generateStarterImageWithGardenName,
    });

    act(() => {
      result.current.handleStarterOverlayChange(false);
    });

    await waitFor(() => {
      expect(result.current.applyStarterNameOverlay).toBe(false);
    });

    act(() => {
      result.current.handleStarterImageSelect("/starter.jpg");
    });

    expect(result.current.applyStarterNameOverlay).toBe(false);
    expect(result.current.selectedStarterImageUrl).toBe("/starter.jpg");
    expect(result.current.profileDraft.profileImageUrl).toBe("/starter.jpg");
    expect(generateStarterImageWithGardenName).not.toHaveBeenCalled();
  });
});
