import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  parseAndSanitizeEditorJsContent,
  sanitizeEditorJsContentForStorage,
} from "@/server/security/editor-js-content";

export const MAX_MEMBER_PROFILE_CONTENT_CHARS = 40_000;

const text = z.string().min(1).max(4_000);
const listMeta = z.strictObject({
  checked: z.boolean().optional(),
  start: z.number().int().min(1).max(99_999).optional(),
  counterType: z
    .enum([
      "numeric",
      "upper-roman",
      "lower-roman",
      "upper-alpha",
      "lower-alpha",
    ])
    .optional(),
});
const listItem = z.strictObject({
  content: text,
  meta: listMeta,
  items: z.array(z.unknown()).max(100),
});
const blockId = z.string().trim().min(1).max(128);
const block = z.discriminatedUnion("type", [
  z.strictObject({
    id: blockId.optional(),
    type: z.literal("paragraph"),
    data: z.strictObject({ text }),
  }),
  z.strictObject({
    id: blockId.optional(),
    type: z.literal("header"),
    data: z.strictObject({ text, level: z.number().int().min(2).max(6) }),
  }),
  z.strictObject({
    id: blockId.optional(),
    type: z.literal("list"),
    data: z.strictObject({
      style: z.enum(["ordered", "unordered", "checklist"]),
      meta: listMeta,
      items: z.array(z.unknown()).min(1).max(100),
    }),
  }),
  z.strictObject({
    id: blockId.optional(),
    type: z.literal("table"),
    data: z.strictObject({
      withHeadings: z.boolean(),
      content: z
        .array(z.array(z.string().max(4_000)).min(1).max(10))
        .min(1)
        .max(20)
        .refine((rows) => rows.every((row) => row.length === rows[0]?.length), {
          message: "All table rows must have the same number of cells.",
        }),
    }),
  }),
]);
const editorContent = z.object({ blocks: z.array(block).min(1).max(200) });

function validateListItems(items: unknown[], depth = 1): void {
  if (items.length === 0) return;
  if (depth > 5) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Profile lists can have at most five levels.",
    });
  }
  for (const item of items) {
    const parsed = listItem.parse(item);
    validateListItems(parsed.items, depth + 1);
  }
}

export function prepareMemberProfileContent(
  requestedContent: string,
  currentContent: string | null,
) {
  let parsedContent: unknown;
  try {
    parsedContent = JSON.parse(requestedContent) as unknown;
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Profile content must be valid EditorJS JSON.",
    });
  }
  const requested = editorContent.parse(parsedContent);
  const current = parseAndSanitizeEditorJsContent(currentContent);
  const currentIds = new Set(
    current?.blocks.flatMap((existing) => (existing.id ? [existing.id] : [])) ??
      [],
  );
  const ids = new Set<string>();
  for (const [index, requestedBlock] of requested.blocks.entries()) {
    if (requestedBlock.id) {
      if (ids.has(requestedBlock.id)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Profile block IDs must be unique.",
        });
      }
      ids.add(requestedBlock.id);
    } else {
      const existing = current?.blocks[index];
      if (existing?.id || existing?.type !== requestedBlock.type) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Give new blocks an ID. Keep older ID-free blocks in place.",
        });
      }
    }
    if (requestedBlock.type === "list") {
      validateListItems(requestedBlock.data.items);
    }
  }

  for (const [index, existingBlock] of (current?.blocks ?? []).entries()) {
    const retained = existingBlock.id
      ? requested.blocks.find((candidate) => candidate.id === existingBlock.id)
      : requested.blocks[index];
    if (
      retained?.type !== existingBlock.type ||
      (!existingBlock.id && retained?.id && currentIds.has(retained.id))
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Keep every existing block and its type. Open the dashboard to remove a block.",
      });
    }
  }

  const sanitized = sanitizeEditorJsContentForStorage(
    JSON.stringify({
      time: Date.now(),
      version: "2.30.8",
      blocks: requested.blocks,
    }),
  );
  if (!sanitized || sanitized.length > MAX_MEMBER_PROFILE_CONTENT_CHARS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Profile content is too large.",
    });
  }
  return sanitized;
}
