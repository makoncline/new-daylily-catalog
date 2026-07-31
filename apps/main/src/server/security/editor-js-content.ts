import type { OutputData } from "@editorjs/editorjs";
import { HTMLElement, NodeType, parse, type Node } from "node-html-parser";

const ALLOWED_INLINE_TAGS = new Set([
  "a",
  "b",
  "br",
  "code",
  "em",
  "i",
  "mark",
  "s",
  "strong",
  "u",
]);

const DROPPED_TAGS = new Set([
  "audio",
  "canvas",
  "embed",
  "iframe",
  "img",
  "math",
  "object",
  "script",
  "source",
  "style",
  "svg",
  "template",
  "video",
]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

const CANONICAL_PUBLIC_HOST = "daylilycatalog.com";

function normalizeSafeHref(href: string) {
  const trimmed = href.trim();
  if (trimmed.startsWith("/")) {
    return trimmed.startsWith("//")
      ? null
      : { href: trimmed, isInternal: true };
  }

  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) {
      return null;
    }

    if (
      [CANONICAL_PUBLIC_HOST, `www.${CANONICAL_PUBLIC_HOST}`].includes(
        parsed.hostname.toLowerCase(),
      )
    ) {
      return {
        href: `${parsed.pathname}${parsed.search}${parsed.hash}`,
        isInternal: true,
      };
    }

    return { href: parsed.toString(), isInternal: false };
  } catch {
    return null;
  }
}

function serializeSanitizedNode(node: Node): string {
  if (node.nodeType === NodeType.TEXT_NODE) {
    return escapeHtml(node.rawText);
  }

  if (!(node instanceof HTMLElement)) {
    return "";
  }

  const tagName = node.rawTagName.toLowerCase();
  if (DROPPED_TAGS.has(tagName)) {
    return "";
  }

  const children = node.childNodes.map(serializeSanitizedNode).join("");
  if (!ALLOWED_INLINE_TAGS.has(tagName)) {
    return children;
  }

  if (tagName === "br") {
    return "<br>";
  }

  if (tagName === "a") {
    const href = node.getAttribute("href");
    const safeHref = href ? normalizeSafeHref(href) : null;
    if (!safeHref) {
      return `<a>${children}</a>`;
    }

    const externalAttributes = safeHref.isInternal
      ? ""
      : ' rel="noopener noreferrer nofollow" target="_blank"';
    return `<a href="${escapeAttribute(safeHref.href)}"${externalAttributes}>${children}</a>`;
  }

  return `<${tagName}>${children}</${tagName}>`;
}

export function sanitizeEditorJsHtml(value: string) {
  const root = parse(`<root>${value}</root>`, {
    comment: false,
    lowerCaseTagName: true,
  });
  const wrapper = root.querySelector("root");

  if (!wrapper) {
    return escapeHtml(value);
  }

  return wrapper.childNodes.map(serializeSanitizedNode).join("");
}

function sanitizeRichTextData(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeEditorJsHtml(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeRichTextData);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        sanitizeRichTextData(nestedValue),
      ]),
    );
  }

  return value;
}

function isEditorJsData(value: unknown): value is OutputData {
  return Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray((value as { blocks?: unknown }).blocks),
  );
}

function createLegacyEditorJsData(content: string): OutputData {
  return {
    time: Date.now(),
    blocks: [
      {
        id: "legacy",
        type: "paragraph",
        data: {
          text: sanitizeEditorJsHtml(content),
        },
      },
    ],
    version: "2.30.0",
  };
}

function sanitizeEditorJsData(data: OutputData): OutputData {
  return {
    ...data,
    blocks: data.blocks.map((block) => ({
      ...block,
      data: sanitizeRichTextData(block.data),
    })),
  };
}

export function parseAndSanitizeEditorJsContent(
  content: string | null,
): OutputData | null {
  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as unknown;
    if (isEditorJsData(parsed)) {
      return sanitizeEditorJsData(parsed);
    }
  } catch {
    return createLegacyEditorJsData(content);
  }

  return createLegacyEditorJsData(content);
}

export function sanitizeEditorJsContentForStorage(content: string | null) {
  const sanitized = parseAndSanitizeEditorJsContent(content);
  return sanitized ? JSON.stringify(sanitized) : null;
}
