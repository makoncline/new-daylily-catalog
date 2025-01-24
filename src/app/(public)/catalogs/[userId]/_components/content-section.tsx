"use client";

import { Editor } from "@/components/editor";
import { type OutputData } from "@editorjs/editorjs";
import { useRef } from "react";
import type EditorJS from "@editorjs/editorjs";

interface ContentSectionProps {
  content?: string | OutputData | null;
}

export function ContentSection({ content }: ContentSectionProps) {
  const editorRef = useRef<EditorJS>();

  if (!content) return null;

  let parsedContent: OutputData;

  if (typeof content === "string") {
    try {
      parsedContent = JSON.parse(content);
    } catch (error) {
      console.error("Error parsing content:", error);
      return null;
    }
  } else {
    parsedContent = content;
  }

  return (
    <div id="content" className="space-y-6">
      <h2 className="text-2xl font-semibold">About</h2>
      <div className="rounded-md border bg-background">
        <Editor editorRef={editorRef} initialContent={parsedContent} readOnly />
      </div>
    </div>
  );
}
