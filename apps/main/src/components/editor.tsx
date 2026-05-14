"use client";

import * as React from "react";
import type EditorJS from "@editorjs/editorjs";
import { type ToolConstructable, type OutputData } from "@editorjs/editorjs";

import { cn } from "@/lib/utils";

interface EditorProps {
  initialContent?: OutputData;
  className?: string;
  editorRef: React.RefObject<EditorJS | null>;
  readOnly?: boolean;
  onChange?: () => void;
}

function destroyEditor(editor: EditorJS) {
  const readyEditor = editor as EditorJS & { isReady?: Promise<void> };

  if (typeof readyEditor.destroy === "function") {
    readyEditor.destroy();
    return;
  }

  void readyEditor.isReady
    ?.then(() => {
      if (typeof readyEditor.destroy === "function") {
        readyEditor.destroy();
      }
    })
    .catch(() => undefined);
}

export function Editor({
  initialContent,
  className,
  editorRef,
  readOnly,
  onChange,
}: EditorProps) {
  const initialContentRef = React.useRef(initialContent);
  const holderRef = React.useRef<HTMLDivElement | null>(null);
  const onChangeRef = React.useRef(onChange);

  // EditorJS owns its DOM after mount, so callback changes should not recreate it.
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  React.useEffect(() => {
    let isCancelled = false;
    const holder = holderRef.current;

    if (!holder || editorRef.current) {
      return;
    }

    void (async () => {
      const EditorJS = (await import("@editorjs/editorjs")).default;
      const Header = (await import("@editorjs/header")).default;
      const Table = (await import("@editorjs/table")).default;
      const List = (await import("@editorjs/list")).default;
      const InlineCode = (await import("@editorjs/inline-code")).default;

      if (isCancelled || editorRef.current) {
        return;
      }

      const editor = new EditorJS({
        holder,
        onChange: () => {
          onChangeRef.current?.();
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

      editorRef.current = editor;
    })();

    return () => {
      isCancelled = true;
      if (editorRef.current) {
        destroyEditor(editorRef.current);
        editorRef.current = null;
      }
    };
  }, [editorRef, readOnly]);

  return (
    <div className={cn("grid w-full gap-10", className)}>
      <div className="prose prose-stone dark:prose-invert mx-auto w-full">
        <div ref={holderRef} id="editor" className="bg-background text-sm" />
      </div>
    </div>
  );
}
