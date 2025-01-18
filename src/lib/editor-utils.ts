import { type OutputData } from "@editorjs/editorjs";

/**
 * Safely parses content into EditorJS format
 * @param content - The content to parse (can be JSON string or plain text)
 * @returns OutputData for EditorJS or undefined if invalid
 */
export function parseEditorContent(
  content: string | null,
): OutputData | undefined {
  if (!content) return undefined;

  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(content) as OutputData;
    // Validate that it has the expected structure
    if (parsed && typeof parsed === "object" && "blocks" in parsed) {
      return parsed;
    }
  } catch {
    // If parsing fails, convert plain text to editor format
    return {
      time: Date.now(),
      blocks: [
        {
          id: "legacy",
          type: "paragraph",
          data: {
            text: content,
          },
        },
      ],
      version: "2.28.2",
    };
  }

  return undefined;
}
