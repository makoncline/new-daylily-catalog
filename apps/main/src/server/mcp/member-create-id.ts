import { createHash, randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";

export function memberCreateId(
  kind: "listing" | "list" | "image",
  userId: string,
  requestId: string,
) {
  return `mcp_${createHash("sha256")
    .update(`${kind}:${userId}:${requestId}`)
    .digest("hex")
    .slice(0, 32)}`;
}

export async function reserveMemberCreateRequest(
  tx: Prisma.TransactionClient,
  kind: "list" | "listing" | "image",
  userId: string,
  requestId: string,
  input: Record<string, unknown>,
) {
  const key = `member-create:${memberCreateId(kind, userId, requestId)}`;
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
  const value = `${fingerprint}:${randomUUID()}`;
  const inserted = await tx.$executeRaw(Prisma.sql`
    INSERT INTO "KeyValue" ("key", "value", "updatedAt")
    VALUES (${key}, ${value}, ${new Date().toISOString()})
    ON CONFLICT ("key") DO NOTHING
  `);
  if (inserted === 1) return true;
  const receipt = await tx.keyValue.findUnique({
    where: { key },
    select: { value: true },
  });
  if (!receipt) {
    throw new Error("The create request receipt is missing.");
  }
  if (!receipt.value.startsWith(`${fingerprint}:`)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Request ID was already used for different data.",
    });
  }
  return false;
}
