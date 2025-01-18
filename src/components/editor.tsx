"use client";

import * as React from "react";
import { type EditorJsData } from "@/types/schemas/profile";
import { cn } from "@/lib/utils";
import "@/styles/editor.css";
import { AlertCircle } from "lucide-react";

// We need to import these types for initialization
import type EditorJS from "@editorjs/editorjs";
import type Header from "@editorjs/header";
import type List from "@editorjs/list";
import type LinkTool from "@editorjs/link";
import type InlineCode from "@editorjs/inline-code";

interface EditorProps {
  defaultValue?: EditorJsData;
  placeholder?: string;
}

interface EditorHandle {
  save: () => Promise<EditorJsData | null>;
}

export const Editor = React.forwardRef<EditorHandle, EditorProps>(
  ({ defaultValue, placeholder }, ref) => {
    const editorRef = React.useRef<EditorJS>();
    const [isMounted, setIsMounted] = React.useState<boolean>(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
    const defaultValueRef = React.useRef(defaultValue);

    const initializeEditor = React.useCallback(async () => {
      if (!editorRef.current) {
        const EditorJS = (await import("@editorjs/editorjs")).default;
        const Header = (await import("@editorjs/header")).default;
        const List = (await import("@editorjs/list")).default;
        const LinkTool = (await import("@editorjs/link")).default;
        const InlineCode = (await import("@editorjs/inline-code")).default;

        const editor = new EditorJS({
          holder: "editor",
          onReady() {
            editorRef.current = editor;
          },
          onChange() {
            setHasUnsavedChanges(true);
          },
          placeholder: placeholder ?? "Type here...",
          inlineToolbar: true,
          data: defaultValueRef.current ?? {
            time: Date.now(),
            blocks: [],
            version: "2.28.2",
          },
          tools: {
            paragraph: {
              config: {
                preserveBlank: true,
              },
            },
            header: {
              class: Header,
              config: {
                levels: [2, 3, 4],
                defaultLevel: 2,
                placeholder: "Type heading...",
              },
              inlineToolbar: true,
            },
            list: {
              class: List,
              inlineToolbar: true,
              config: {
                defaultStyle: "unordered",
              },
            },
            linkTool: {
              class: LinkTool,
              config: {
                endpoint: "/api/link",
              },
            },
            inlineCode: {
              class: InlineCode,
              shortcut: "CMD+SHIFT+M",
            },
          },
        });
      }
    }, [placeholder]);

    React.useEffect(() => {
      setIsMounted(true);
    }, []);

    React.useEffect(() => {
      if (isMounted) {
        initializeEditor();

        return () => {
          if (editorRef.current) {
            editorRef.current.destroy();
            editorRef.current = undefined;
          }
        };
      }
    }, [isMounted, initializeEditor]);

    // Handle navigation warning
    React.useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (hasUnsavedChanges) {
          e.preventDefault();
          e.returnValue = "";
        }
      };

      if (typeof window !== "undefined") {
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () =>
          window.removeEventListener("beforeunload", handleBeforeUnload);
      }
    }, [hasUnsavedChanges]);

    React.useImperativeHandle(
      ref,
      () => ({
        async save() {
          if (!editorRef.current) {
            return null;
          }
          const data = await editorRef.current.save();
          setHasUnsavedChanges(false);
          defaultValueRef.current = data as EditorJsData;
          return data as EditorJsData;
        },
      }),
      [],
    );

    if (!isMounted) {
      return (
        <div className="rounded-md border bg-background">
          <div className="min-h-[200px] px-3 py-4" />
        </div>
      );
    }

    return (
      <div className="relative">
        {hasUnsavedChanges && (
          <div className="mb-2 flex items-center gap-2 text-xs text-yellow-500">
            <AlertCircle className="h-4 w-4" />
            <span>You have unsaved changes</span>
          </div>
        )}
        <div className="rounded-md border bg-background">
          <div
            id="editor"
            className={cn(
              "prose prose-stone dark:prose-invert",
              "min-h-[200px] px-3 py-4 text-sm",
              "focus-visible:outline-none",
            )}
          />
        </div>
      </div>
    );
  },
);

Editor.displayName = "Editor";
