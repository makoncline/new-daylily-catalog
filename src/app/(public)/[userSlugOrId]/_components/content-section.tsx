"use client";

import { Editor } from "@/components/editor";
import { type OutputData } from "@editorjs/editorjs";
import { useRef } from "react";
import type EditorJS from "@editorjs/editorjs";
import { Skeleton } from "@/components/ui/skeleton";

interface ContentSectionProps {
  content: OutputData | null;
}

export function ContentSection({ content }: ContentSectionProps) {
  const editorRef = useRef<EditorJS | null>(null);

  if (!content) return null;

  return (
    <div id="about">
      <Editor editorRef={editorRef} initialContent={content} readOnly />
    </div>
  );
}

export function ContentSectionSkeleton() {
  return <Skeleton className="h-[300px] w-full" />;
}
