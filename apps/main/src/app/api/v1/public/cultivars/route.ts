import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getTrustedBaseUrl } from "@/lib/agent-readiness";
import { publicJson, publicReadResponse } from "@/server/api/public-http";
import { publicDb } from "@/server/db";
import {
  getPublicCultivarReference,
  serializeCultivarReference,
} from "@/server/services/public-cultivar-reference";

export const runtime = "nodejs";

const inputSchema = z
  .strictObject({
    cultivarReferenceId: z.string().trim().min(1).max(128).optional(),
    normalizedName: z.string().trim().min(1).max(200).optional(),
  })
  .refine(
    (input) =>
      Number(Boolean(input.cultivarReferenceId)) +
        Number(Boolean(input.normalizedName)) ===
      1,
  );

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const entries = [...params];
  if (new Set(entries.map(([key]) => key)).size !== entries.length) {
    return publicJson({ error: "invalid_query" }, 400);
  }
  const input = inputSchema.safeParse(Object.fromEntries(entries));
  if (!input.success) return publicJson({ error: "invalid_query" }, 400);

  return publicReadResponse("public-cultivar-api", async () => {
    const cultivarReference = await getPublicCultivarReference({
      database: publicDb,
      ...input.data,
    });
    if (!cultivarReference) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    return {
      cultivar: serializeCultivarReference(
        cultivarReference,
        getTrustedBaseUrl(request),
      ),
    };
  });
}
