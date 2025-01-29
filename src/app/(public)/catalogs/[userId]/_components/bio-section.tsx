"use client";

import { EditorOutput } from "@/components/editor/editor-output";
import { type OutputData } from "@editorjs/editorjs";
import { H2 } from "@/components/typography";

interface ContentSectionProps {
  content?: string | OutputData | null;
}

export function ContentSection({ content }: ContentSectionProps) {
  if (!content) return null;

  return (
    <div id="content">
      <H2 className="text-2xl">About</H2>
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
