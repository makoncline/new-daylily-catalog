import * as React from "react";
import { act, render, waitFor } from "@testing-library/react";
import type EditorJS from "@editorjs/editorjs";
import type { EditorConfig } from "@editorjs/editorjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Editor } from "@/components/editor";

const editorState = vi.hoisted(() => ({
  config: undefined as EditorConfig | undefined,
  destroy: vi.fn(),
  ready: Promise.resolve(),
  resolveReady: (() => undefined) as () => void,
  toggleReadOnly: vi.fn(),
}));

vi.mock("@editorjs/editorjs", () => ({
  default: class EditorJSMock {
    isReady = editorState.ready;
    destroy = editorState.destroy;
    readOnly = { toggle: editorState.toggleReadOnly };

    constructor(config: EditorConfig) {
      editorState.config = config;
    }
  },
}));

vi.mock("@editorjs/header", () => ({ default: class Header {} }));
vi.mock("@editorjs/table", () => ({ default: class Table {} }));
vi.mock("@editorjs/list", () => ({ default: class List {} }));
vi.mock("@editorjs/inline-code", () => ({ default: class InlineCode {} }));

describe("Editor read-only lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    editorState.config = undefined;
    editorState.ready = new Promise<void>((resolve) => {
      editorState.resolveReady = resolve;
    });
  });

  it("enters read-only mode only after EditorJS is ready", async () => {
    const editorRef = React.createRef<EditorJS | null>();

    render(<Editor editorRef={editorRef} readOnly />);

    await waitFor(() => expect(editorState.config).toBeDefined());

    expect(editorState.config?.readOnly).not.toBe(true);
    expect(editorState.toggleReadOnly).not.toHaveBeenCalled();

    await act(async () => {
      editorState.resolveReady();
      await editorState.ready;
    });

    await waitFor(() =>
      expect(editorState.toggleReadOnly).toHaveBeenCalledWith(true),
    );
  });

  it("does not toggle read-only after unmount", async () => {
    const editorRef = React.createRef<EditorJS | null>();
    const { unmount } = render(<Editor editorRef={editorRef} readOnly />);

    await waitFor(() => expect(editorState.config).toBeDefined());
    unmount();

    await act(async () => {
      editorState.resolveReady();
      await editorState.ready;
    });

    expect(editorState.toggleReadOnly).not.toHaveBeenCalled();
  });
});
