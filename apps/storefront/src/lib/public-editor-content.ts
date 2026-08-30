import type { EditorOutputData } from "@/types";

export type PublicEditorContentBlock =
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "header"; text: string; level: number }
  | {
      id: string;
      type: "list";
      style: "ordered" | "unordered";
      items: string[];
    };

function getPlainEditorText(value: unknown) {
  if (typeof value !== "string") return null;

  const text = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .trim();

  return text || null;
}

function getListItemText(item: unknown) {
  if (typeof item === "string") return getPlainEditorText(item);
  if (!item || typeof item !== "object") return null;
  return getPlainEditorText((item as { content?: unknown }).content);
}

export function getPublicEditorContentBlocks(
  content: EditorOutputData | null | undefined,
): PublicEditorContentBlock[] {
  if (!content) return [];

  return content.blocks.flatMap<PublicEditorContentBlock>((block, index) => {
    const id = `${block.id ?? block.type}-${index}`;

    if (block.type === "paragraph") {
      const text = getPlainEditorText(block.data.text);
      return text ? [{ id, type: "paragraph" as const, text }] : [];
    }

    if (block.type === "header") {
      const text = getPlainEditorText(block.data.text);
      if (!text) return [];
      const sourceLevel =
        typeof block.data.level === "number" ? block.data.level : 2;
      const level = Math.min(6, Math.max(1, Math.trunc(sourceLevel)));
      return [{ id, type: "header" as const, text, level }];
    }

    if (block.type === "list" && Array.isArray(block.data.items)) {
      const items = block.data.items.flatMap((item) => {
        const text = getListItemText(item);
        return text ? [text] : [];
      });
      return items.length > 0
        ? [
            {
              id,
              type: "list" as const,
              style:
                block.data.style === "ordered"
                  ? ("ordered" as const)
                  : ("unordered" as const),
              items,
            },
          ]
        : [];
    }

    return [];
  });
}

export function getPublicEditorPlainText(
  content: EditorOutputData | null | undefined,
) {
  return getPublicEditorContentBlocks(content)
    .map((block) => {
      if (block.type !== "list") return block.text;
      return block.items
        .map((item, index) =>
          block.style === "ordered" ? `${index + 1}. ${item}` : `- ${item}`,
        )
        .join("\n");
    })
    .join("\n\n");
}
