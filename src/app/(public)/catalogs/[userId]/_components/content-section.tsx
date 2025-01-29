"use client";

import { Editor } from "@/components/editor";
import { type OutputData } from "@editorjs/editorjs";
import { useRef } from "react";
import type EditorJS from "@editorjs/editorjs";
import { Skeleton } from "@/components/ui/skeleton";

interface ContentSectionProps {
  content?: string | OutputData | null;
}

export function ContentSection({ content }: ContentSectionProps) {
  const editorRef = useRef<EditorJS>();

  if (!content) return null;

  let parsedContent: OutputData;

  if (typeof content === "string") {
    try {
      parsedContent = JSON.parse(content) as OutputData;
    } catch (error) {
      console.error("Error parsing content:", error);
      return null;
    }
  } else {
    parsedContent = content;
  }

  return (
    <div id="about" className="">
      <Editor editorRef={editorRef} initialContent={parsedContent} readOnly />
    </div>
  );
}

export function ContentSectionSkeleton() {
  return <Skeleton className="h-[300px] w-full" />;
}
