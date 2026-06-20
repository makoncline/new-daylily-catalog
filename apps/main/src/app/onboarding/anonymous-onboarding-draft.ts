import {
  ANONYMOUS_ONBOARDING_DRAFT_KEY,
  MAX_ONBOARDING_IMAGE_DATA_URL_LENGTH,
  createAnonymousOnboardingDraft,
  parseAnonymousOnboardingDraft,
  type AnonymousOnboardingDraft,
} from "@/lib/onboarding/anonymous-onboarding-draft";

export {
  ANONYMOUS_ONBOARDING_DRAFT_KEY,
  ANONYMOUS_ONBOARDING_DRAFT_VERSION,
  DEFAULT_ANONYMOUS_ONBOARDING_LISTING,
  DEFAULT_ANONYMOUS_ONBOARDING_PROFILE,
  MAX_ONBOARDING_IMAGE_DATA_URL_LENGTH,
  createAnonymousOnboardingDraft,
  parseAnonymousOnboardingDraft,
} from "@/lib/onboarding/anonymous-onboarding-draft";
export type {
  AnonymousOnboardingDraft,
  AnonymousOnboardingListingPreviewDraft,
  AnonymousOnboardingProfileDraft,
  AnonymousOnboardingStepId,
} from "@/lib/onboarding/anonymous-onboarding-draft";

type DraftStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

function getStorage(storage?: DraftStorage | null) {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function readAnonymousOnboardingDraft(
  storage?: DraftStorage | null,
): AnonymousOnboardingDraft {
  const selectedStorage = getStorage(storage);
  if (!selectedStorage) {
    return createAnonymousOnboardingDraft();
  }

  try {
    const rawValue = selectedStorage.getItem(ANONYMOUS_ONBOARDING_DRAFT_KEY);
    if (!rawValue) {
      return createAnonymousOnboardingDraft();
    }

    const parsed = parseAnonymousOnboardingDraft(JSON.parse(rawValue));
    return parsed ?? createAnonymousOnboardingDraft();
  } catch {
    try {
      selectedStorage.removeItem(ANONYMOUS_ONBOARDING_DRAFT_KEY);
    } catch {
      // Ignore storage cleanup failures; the caller can still continue.
    }
    return createAnonymousOnboardingDraft();
  }
}

export function writeAnonymousOnboardingDraft(
  draft: AnonymousOnboardingDraft,
  storage?: DraftStorage | null,
) {
  const selectedStorage = getStorage(storage);
  if (!selectedStorage) {
    return false;
  }

  try {
    selectedStorage.setItem(
      ANONYMOUS_ONBOARDING_DRAFT_KEY,
      JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearAnonymousOnboardingDraft(storage?: DraftStorage | null) {
  const selectedStorage = getStorage(storage);
  if (!selectedStorage) {
    return false;
  }

  try {
    selectedStorage.removeItem(ANONYMOUS_ONBOARDING_DRAFT_KEY);
    return true;
  } catch {
    return false;
  }
}

function loadImageFromDataUrl(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to read selected image."));
    image.src = dataUrl;
  });
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to read selected image."));
    };
    reader.onerror = () => reject(new Error("Unable to read selected image."));
    reader.readAsDataURL(file);
  });
}

export async function compressOnboardingImageFile(file: File) {
  const originalDataUrl = await fileToDataUrl(file);
  const image = await loadImageFromDataUrl(originalDataUrl);
  const canvas = document.createElement("canvas");
  const size = 640;
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image editing is not available in this browser.");
  }

  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    size,
    size,
  );

  const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.78);
  if (compressedDataUrl.length > MAX_ONBOARDING_IMAGE_DATA_URL_LENGTH) {
    throw new Error("Please choose a smaller image.");
  }

  return compressedDataUrl;
}
