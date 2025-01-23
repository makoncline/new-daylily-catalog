"use client";

import type { OutputData } from "@editorjs/editorjs";

interface BlockData {
  id: string;
  type: "paragraph" | "header" | "list";
  data: {
    text?: string;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    style?: "ordered" | "unordered";
    items?: string[];
  };
}

interface EditorOutputProps {
  content: OutputData | string | null;
}

export function EditorOutput({ content }: EditorOutputProps) {
  // Handle null content
  if (!content) return null;

  // Handle string content
  if (typeof content === "string") {
    return (
      <div className="prose dark:prose-invert">
        <p>{content}</p>
      </div>
    );
  }

  // Handle no blocks or empty blocks array
  if (!content.blocks?.length) return null;

  return (
    <div className="prose dark:prose-invert">
      {content.blocks.map((block: BlockData, index) => {
        switch (block.type) {
          case "paragraph":
            return <p key={index}>{block.data.text}</p>;
          case "header":
            const Tag = `h${block.data.level}` as keyof JSX.IntrinsicElements;
            return <Tag key={index}>{block.data.text}</Tag>;
          case "list":
            const ListTag = block.data.style === "ordered" ? "ol" : "ul";
            return (
              <ListTag key={index}>
                {block.data.items?.map((item, i) => <li key={i}>{item}</li>)}
              </ListTag>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
