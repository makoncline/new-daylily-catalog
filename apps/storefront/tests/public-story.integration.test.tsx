import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PublicStory } from "@/components/public-story";
import {
  getPublicEditorContentBlocks,
  getPublicEditorPlainText,
} from "@/lib/public-editor-content";
import type { EditorOutputData } from "@/types";

describe("public seller story", () => {
  it("renders the supported Editor.js blocks as safe React text", () => {
    const content: EditorOutputData = {
      blocks: [
        {
          id: "intro",
          type: "paragraph",
          data: {
            text: 'Welcome <strong>friends</strong><img src="x" onerror="alert(1)">.',
          },
        },
        {
          id: "heading",
          type: "header",
          data: { text: "Garden notes", level: 4 },
        },
        {
          id: "list",
          type: "list",
          data: {
            style: "ordered",
            items: ["First bed", { content: "Second <em>bed</em>" }],
          },
        },
        {
          id: "unsupported",
          type: "raw",
          data: { html: "Must not render" },
        },
      ],
    };

    const markup = renderToStaticMarkup(<PublicStory content={content} />);
    const blocks = getPublicEditorContentBlocks(content);

    expect(blocks.map((block) => block.type)).toEqual([
      "paragraph",
      "header",
      "list",
    ]);
    expect(getPublicEditorPlainText(content)).toBe(
      "Welcome friends.\n\nGarden notes\n\n1. First bed\n2. Second bed",
    );
    expect(markup).toContain("Welcome friends.");
    expect(markup).toContain("<h3");
    expect(markup).toContain("Garden notes");
    expect(markup).toContain("<ol");
    expect(markup).toContain("Second bed");
    expect(markup).not.toContain("<img");
    expect(markup).not.toContain("onerror");
    expect(markup).not.toContain("Must not render");
  });
});
