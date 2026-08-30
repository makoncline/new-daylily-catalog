import { cn } from "@daylily-catalog/ui/lib/utils";

import {
  getPublicEditorContentBlocks,
  type PublicEditorContentBlock,
} from "@/lib/public-editor-content";
import type { EditorOutputData } from "@/types";

function renderPublicBlock(block: PublicEditorContentBlock) {
  if (block.type === "paragraph") {
    return (
      <p
        key={block.id}
        className="text-muted-foreground leading-7 whitespace-pre-line"
      >
        {block.text}
      </p>
    );
  }

  if (block.type === "header") {
    return (
      <h3 key={block.id} className="font-serif text-2xl font-semibold">
        {block.text}
      </h3>
    );
  }

  if (block.type === "list") {
    const List = block.style === "ordered" ? "ol" : "ul";
    return (
      <List
        key={block.id}
        className={cn(
          "text-muted-foreground grid gap-2 pl-6 leading-7",
          List === "ol" ? "list-decimal" : "list-disc",
        )}
      >
        {block.items.map((item, itemIndex) => (
          <li key={`${block.id}-${itemIndex}`}>{item}</li>
        ))}
      </List>
    );
  }

  return null;
}

export function PublicStory({ content }: { content: EditorOutputData | null }) {
  const blocks = getPublicEditorContentBlocks(content);
  if (blocks.length === 0) return null;

  return (
    <section
      className="bg-card grid gap-6 rounded-2xl border p-6 shadow-sm lg:grid-cols-[minmax(14rem,0.4fr)_minmax(0,1fr)] lg:p-10"
      aria-labelledby="storefront-story-heading"
    >
      <div className="grid content-start gap-2">
        <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
          About the garden
        </p>
        <h2
          id="storefront-story-heading"
          className="font-serif text-4xl font-semibold"
        >
          From the garden
        </h2>
      </div>
      <div className="grid content-start gap-4">
        {blocks.map(renderPublicBlock)}
      </div>
    </section>
  );
}
