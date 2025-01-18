"use client";

import * as React from "react";
import type EditorJS from "@editorjs/editorjs";
import { type OutputData } from "@editorjs/editorjs";

import "@/styles/editor.css";
import { cn } from "@/lib/utils";

interface EditorProps {
  initialContent?: OutputData;
  placeholder?: string;
  className?: string;
  editorRef: React.MutableRefObject<EditorJS | undefined>;
}

export function Editor({
  initialContent,
  placeholder,
  className,
  editorRef,
}: EditorProps) {
  const [isMounted, setIsMounted] = React.useState<boolean>(false);

  const initialContentRef = React.useRef(initialContent);

  const initializeEditor = React.useCallback(async () => {
    if (editorRef.current) return;

    const EditorJS = (await import("@editorjs/editorjs")).default;
    const Header = (await import("@editorjs/header")).default;
    const Table = (await import("@editorjs/table")).default;
    const List = (await import("@editorjs/list")).default;
    const Code = (await import("@editorjs/code")).default;
    const InlineCode = (await import("@editorjs/inline-code")).default;

    const editor = new EditorJS({
      holder: "editor",
      onReady() {
        editorRef.current = editor;
      },
      placeholder: placeholder ?? "Type something...",
      inlineToolbar: true,
      data: initialContentRef.current,
      tools: {
        header: Header,
        list: List,
        code: Code,
        inlineCode: InlineCode,
        table: Table,
      },
    });
  }, [placeholder, editorRef]);

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
      <div className="prose prose-stone dark:prose-invert mx-auto w-[800px]">
        <div
          id="editor"
          className="min-h-[500px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
        />
      </div>
    </div>
  );
}
