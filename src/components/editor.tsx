"use client";

import * as React from "react";
import type EditorJS from "@editorjs/editorjs";
import { ToolConstructable, type OutputData } from "@editorjs/editorjs";

import "@/styles/editor.css";
import { cn } from "@/lib/utils";

interface EditorProps {
  initialContent?: OutputData;
  className?: string;
  editorRef: React.MutableRefObject<EditorJS | undefined>;
  readOnly?: boolean;
}

export function Editor({
  initialContent,
  className,
  editorRef,
  readOnly,
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
  }, [editorRef, readOnly]);

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
          editorRef.current = undefined;
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
