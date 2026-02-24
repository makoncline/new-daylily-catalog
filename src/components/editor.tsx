"use client";

import * as React from "react";
import type EditorJS from "@editorjs/editorjs";
import { type ToolConstructable, type OutputData } from "@editorjs/editorjs";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
interface EditorProps {
  initialContent?: OutputData;
  className?: string;
  editorRef: React.RefObject<EditorJS | null>;
  readOnly?: boolean;
  onChange?: () => void;
}

export function Editor({
  initialContent,
  className,
  editorRef,
  readOnly,
  onChange,
}: EditorProps) {
  const [isMounted, setIsMounted] = React.useState<boolean>(false);

  const initialContentRef = React.useRef(initialContent);

  const initializeEditor = React.useCallback(async () => {
    if (editorRef.current) return;

    const EditorJS = (await import("@editorjs/editorjs")).default;
    const Header = (await import("@editorjs/header")).default;
    const Table = (await import("@editorjs/table")).default;
    const List = (await import("@editorjs/list")).default;
    const InlineCode = (await import("@editorjs/inline-code")).default;

    const editor = new EditorJS({
      holder: "editor",
      onReady() {
        editorRef.current = editor;
      },
      onChange() {
        onChange?.();
      },
      placeholder: "Type something...",
      inlineToolbar: true,
      readOnly: readOnly,
      data: initialContentRef.current,
      tools: {
        header: {
          class: Header as unknown as ToolConstructable,
          inlineToolbar: true,
          config: {
            levels: [2, 3, 4, 5, 6],
            defaultLevel: 2,
          },
        },
        list: List,
        inlineCode: InlineCode,
        table: Table,
      },
    });
  }, [editorRef, onChange, readOnly]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMounted(true);
    }
  }, []);

  React.useEffect(() => {
    if (isMounted && !editorRef.current) {
      void initializeEditor();

      return () => {
        if (editorRef.current) {
          editorRef.current.destroy();
          editorRef.current = null;
        }
      };
    }
  }, [isMounted, initializeEditor, editorRef]);

  if (!isMounted) {
    return null;
  }

  return (
    <div className={cn("grid w-full gap-10", className)}>
      <div className="prose prose-stone dark:prose-invert mx-auto w-full">
        <div id="editor" className="bg-background text-sm" />
      </div>
    </div>
  );
}

export function EditorSkeleton() {
  return <Skeleton className="h-[300px] w-full" />;
}
