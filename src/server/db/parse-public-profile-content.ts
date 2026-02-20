import { type OutputData } from "@editorjs/editorjs";

function isEditorOutputData(value: unknown): value is OutputData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeOutput = value as { blocks?: unknown };
  return Array.isArray(maybeOutput.blocks);
}

export function parsePublicProfileContent(content: string | null | undefined) {
  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as unknown;
    if (!isEditorOutputData(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
