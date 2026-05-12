// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  parseAndSanitizeEditorJsContent,
  sanitizeEditorJsContentForStorage,
  sanitizeEditorJsHtml,
} from "@/server/security/editor-js-content";

describe("EditorJS content sanitizer", () => {
  it("removes scriptable HTML from rich text fields", () => {
    const content = {
      time: 1,
      blocks: [
        {
          id: "paragraph-1",
          type: "paragraph",
          data: {
            text: `Hello <b onclick="alert(1)">safe</b><img src=x onerror="alert(1)"><script>alert("xss")</script>`,
          },
        },
        {
          id: "list-1",
          type: "list",
          data: {
            items: [
              {
                content: `<a href="javascript:alert(1)" onclick="alert(1)">bad link</a>`,
                items: [],
              },
            ],
          },
        },
      ],
      version: "2.30.0",
    };

    const sanitized = sanitizeEditorJsContentForStorage(
      JSON.stringify(content),
    );
    expect(sanitized).not.toBeNull();

    const parsed = JSON.parse(sanitized ?? "{}") as typeof content;

    expect(parsed.blocks[0]?.data.text).toBe("Hello <b>safe</b>");
    expect(parsed.blocks[0]?.data.text).not.toContain("onclick");
    expect(parsed.blocks[0]?.data.text).not.toContain("<img");
    expect(parsed.blocks[0]?.data.text).not.toContain("<script");
    expect(parsed.blocks[1]?.data.items?.[0]?.content).toBe(
      "<a>bad link</a>",
    );
  });

  it("preserves safe inline links with defensive attributes", () => {
    const sanitized = sanitizeEditorJsHtml(
      `<a href="https://example.com/daylily?a=1&b=2">Example</a>`,
    );

    expect(sanitized).toBe(
      `<a href="https://example.com/daylily?a=1&amp;b=2" rel="noopener noreferrer nofollow" target="_blank">Example</a>`,
    );
  });

  it("converts legacy plain text into escaped EditorJS content", () => {
    const parsed = parseAndSanitizeEditorJsContent(
      `Legacy <img src=x onerror="alert(1)"> text`,
    );

    expect(parsed?.blocks).toHaveLength(1);
    expect(parsed?.blocks[0]?.data.text).toBe("Legacy  text");
  });
});
