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

function loadImageElement(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to read starter image."));
    image.src = url;
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

function drawImageCoverSquare({
  context,
  image,
  size,
  filter,
  globalAlpha,
}: {
  context: CanvasRenderingContext2D;
  image: HTMLImageElement;
  size: number;
  filter?: string;
  globalAlpha?: number;
}) {
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const imageAspectRatio = imageWidth / imageHeight;

  let sourceWidth = imageWidth;
  let sourceHeight = imageHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (imageAspectRatio > 1) {
    sourceWidth = imageHeight;
    sourceX = (imageWidth - sourceWidth) / 2;
  } else if (imageAspectRatio < 1) {
    sourceHeight = imageWidth;
    sourceY = (imageHeight - sourceHeight) / 2;
  }

  context.save();
  context.filter = filter ?? "none";
  context.globalAlpha = globalAlpha ?? 1;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    size,
    size,
  );
  context.restore();
}

const STARTER_IMAGE_CANVAS_SIZE = 640;
const STARTER_IMAGE_BLUR_PX = 4;
const STARTER_IMAGE_BLUR_ALPHA = 0.35;
const STARTER_IMAGE_TEXT_FIT_RATIO = 0.75;
const STARTER_IMAGE_TEXT_MAX_LINES = 4;

function drawStarterImageOverlay({
  context,
  size,
}: {
  context: CanvasRenderingContext2D;
  size: number;
}) {
  context.fillStyle = "rgba(17, 24, 39, 0.6)";
  context.fillRect(0, 0, size, size);
}

function drawGardenNameOverlay({
  context,
  gardenName,
  size,
}: {
  context: CanvasRenderingContext2D;
  gardenName: string;
  size: number;
}) {
  const fontFamily =
    window.getComputedStyle(document.body).fontFamily ||
    "ui-sans-serif, system-ui, sans-serif";
  const maxWidth = size * STARTER_IMAGE_TEXT_FIT_RATIO;
  const maxHeight = size * STARTER_IMAGE_TEXT_FIT_RATIO;
  const layout = getGardenNameLayout({
    context,
    fontFamily,
    maxHeight,
    maxWidth,
    text: gardenName.trim() || "Garden Name",
  });
  const textBlockHeight = layout.lines.length * layout.lineHeight;
  const textStartX = (size - maxWidth) / 2;
  const textStartY = (size - textBlockHeight) / 2 + layout.fontSize;

  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.font = `800 ${layout.fontSize}px ${fontFamily}`;
  context.fillStyle = "rgba(255, 255, 255, 1)";
  context.shadowColor = "rgba(0, 0, 0, 0.24)";
  context.shadowBlur = Math.max(4, layout.fontSize * 0.04);
  context.shadowOffsetX = 0;
  context.shadowOffsetY = Math.max(2, layout.fontSize * 0.02);

  layout.lines.forEach((line, index) => {
    context.fillText(line, textStartX, textStartY + index * layout.lineHeight);
  });
}

function getGardenNameLayout({
  context,
  fontFamily,
  maxHeight,
  maxWidth,
  text,
}: {
  context: CanvasRenderingContext2D;
  fontFamily: string;
  maxHeight: number;
  maxWidth: number;
  text: string;
}) {
  const words = text.split(/\s+/).filter(Boolean);
  const maxFontSize = 118;
  const minFontSize = 28;
  const lineCandidates = buildGardenNameLineCandidates(
    words,
    STARTER_IMAGE_TEXT_MAX_LINES,
  );

  for (const lines of lineCandidates) {
    for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 2) {
      context.font = `700 ${fontSize}px ${fontFamily}`;
      const lineHeight = fontSize * 1.08;
      const textHeight = lineHeight * lines.length;
      const widestLine = Math.max(
        ...lines.map((line) => context.measureText(line).width),
        0,
      );

      if (textHeight <= maxHeight && widestLine <= maxWidth) {
        return { fontSize, lineHeight, lines };
      }
    }
  }

  return {
    fontSize: minFontSize,
    lineHeight: minFontSize * 1.08,
    lines: [text.length > 28 ? `${text.slice(0, 28).trimEnd()}...` : text],
  };
}

function buildGardenNameLineCandidates(words: string[], maxLines: number) {
  if (words.length === 0) {
    return [["Garden Name"]];
  }

  const candidates: string[][] = [];
  const seen = new Set<string>();

  const addCandidate = (lines: string[]) => {
    const key = lines.join("|");
    if (!seen.has(key)) {
      seen.add(key);
      candidates.push(lines);
    }
  };

  if (words.length <= maxLines) {
    addCandidate(words);
  }

  for (
    let lineCount = Math.min(maxLines, words.length);
    lineCount >= 1;
    lineCount -= 1
  ) {
    const lines = distributeWordsIntoLines(words, lineCount);
    if (lines.length > 0) {
      addCandidate(lines);
    }
  }

  return candidates.length > 0 ? candidates : [words];
}

function distributeWordsIntoLines(words: string[], lineCount: number) {
  if (lineCount <= 0 || words.length === 0) {
    return [];
  }

  if (lineCount >= words.length) {
    return [...words];
  }

  const lines: string[] = [];
  let startIndex = 0;

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    const remainingWords = words.length - startIndex;
    const remainingLines = lineCount - lineIndex;
    const wordsForLine = Math.ceil(remainingWords / remainingLines);
    const line = words
      .slice(startIndex, startIndex + wordsForLine)
      .join(" ")
      .trim();

    if (line) {
      lines.push(line);
      startIndex += wordsForLine;
    }
  }

  if (startIndex < words.length && lines.length > 0) {
    const remainingWords = words.slice(startIndex).join(" ").trim();
    const lastLineIndex = lines.length - 1;
    if (remainingWords) {
      lines[lastLineIndex] = `${lines[lastLineIndex]} ${remainingWords}`.trim();
    }
  }

  return lines;
}

export async function createOnboardingProfileImageFromStarter({
  applyNameOverlay,
  baseImageUrl,
  gardenName,
}: {
  applyNameOverlay: boolean;
  baseImageUrl: string;
  gardenName: string;
}) {
  const image = await loadImageElement(baseImageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = STARTER_IMAGE_CANVAS_SIZE;
  canvas.height = STARTER_IMAGE_CANVAS_SIZE;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image editing is not available in this browser.");
  }

  drawImageCoverSquare({
    context,
    image,
    size: STARTER_IMAGE_CANVAS_SIZE,
  });

  if (applyNameOverlay) {
    drawImageCoverSquare({
      context,
      filter: `blur(${STARTER_IMAGE_BLUR_PX}px)`,
      globalAlpha: STARTER_IMAGE_BLUR_ALPHA,
      image,
      size: STARTER_IMAGE_CANVAS_SIZE,
    });
    drawStarterImageOverlay({ context, size: STARTER_IMAGE_CANVAS_SIZE });
    drawGardenNameOverlay({
      context,
      gardenName,
      size: STARTER_IMAGE_CANVAS_SIZE,
    });
  }

  const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
  if (dataUrl.length > MAX_ONBOARDING_IMAGE_DATA_URL_LENGTH) {
    throw new Error("Please choose a smaller image.");
  }

  return dataUrl;
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
