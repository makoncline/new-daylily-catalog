interface EditorBlock {
  id: string;
  type: string;
  data: {
    text?: string;
    level?: number;
  };
}

interface EditorContent {
  time: number;
  blocks?: EditorBlock[];
  version: string;
}

export function hasProfileContent(content: string | null | undefined) {
  if (!content) return false;

  try {
    const parsed = JSON.parse(content) as EditorContent;
    if (!parsed.blocks || parsed.blocks.length === 0) return false;

    return parsed.blocks.some((block) =>
      Boolean(block.data.text && block.data.text.trim().length > 0),
    );
  } catch {
    return content.trim().length > 0;
  }
}
