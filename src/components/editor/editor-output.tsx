"use client";

import type { OutputData, OutputBlockData } from "@editorjs/editorjs";
import "../../styles/editor.css";
import { cn } from "@/lib/utils";

interface ListItem {
  content: string;
  meta: Record<string, unknown>;
  items: ListItem[];
}

type BlockData = OutputBlockData<
  "paragraph" | "header" | "list",
  {
    text?: string;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    style?: "ordered" | "unordered";
    items?: ListItem[];
    meta?: Record<string, unknown>;
  }
>;

interface EditorOutputProps {
  content: OutputData | string | null;
  className?: string;
}

function renderListItems(items: ListItem[]) {
  return items.map((item, i) => (
    <li key={i}>
      {item.content}
      {item.items?.length > 0 && <ul>{renderListItems(item.items)}</ul>}
    </li>
  ));
}

export function EditorOutput({ content, className }: EditorOutputProps) {
  // Handle null content
  if (!content) return null;

  // Handle string content
  if (typeof content === "string") {
    return (
      <div className={cn("prose prose-stone dark:prose-invert", className)}>
        {content}
      </div>
    );
  }

  return (
    <div className={cn("prose prose-stone dark:prose-invert", className)}>
      <div className="codex-editor">
        {content.blocks.map((block: OutputBlockData<string, any>, index) => {
          if (
            block.type !== "paragraph" &&
            block.type !== "header" &&
            block.type !== "list"
          ) {
            return null;
          }

          switch (block.type) {
            case "paragraph":
              return (
                <div key={index} className="ce-block">
                  <div className="ce-block__content">
                    <div className="ce-paragraph cdx-block">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: block.data.text || "",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            case "header":
              const Tag = `h${block.data.level}` as keyof JSX.IntrinsicElements;
              return (
                <div key={index} className="ce-block">
                  <div className="ce-block__content">
                    <div className={`ce-header h${block.data.level} cdx-block`}>
                      <Tag>{block.data.text}</Tag>
                    </div>
                  </div>
                </div>
              );
            case "list":
              const ListTag = block.data.style === "ordered" ? "ol" : "ul";
              return (
                <div key={index} className="ce-block">
                  <div className="ce-block__content">
                    <div className={`ce-${block.data.style}-list cdx-block`}>
                      <ListTag>
                        {block.data.items && renderListItems(block.data.items)}
                      </ListTag>
                    </div>
                  </div>
                </div>
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
