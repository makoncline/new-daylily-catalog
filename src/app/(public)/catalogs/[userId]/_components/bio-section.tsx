"use client";

import { EditorOutput } from "@/components/editor/editor-output";
import { type OutputData } from "@editorjs/editorjs";

interface ContentSectionProps {
  content?: string | OutputData | null;
}

export function ContentSection({ content }: ContentSectionProps) {
  if (!content) return null;

  return (
    <div id="content">
      <h2 className="text-2xl font-semibold">About</h2>
      <EditorOutput
        content={
          typeof content === "string"
            ? (JSON.parse(content) as OutputData)
            : content
        }
      />
    </div>
  );
}
