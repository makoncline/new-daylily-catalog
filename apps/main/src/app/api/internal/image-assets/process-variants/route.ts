import { NextResponse } from "next/server";
import { z } from "zod";
import { env, requireEnv } from "@/env";
import { db } from "@/server/db";
import { processPendingImageAssetVariants } from "@/server/services/image-asset-variant-processor";

const processVariantsInputSchema = z.object({
  assetId: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(25).optional(),
  retryFailed: z.boolean().optional().default(false),
});

function isAuthorized(request: Request) {
  const secret = requireEnv("CLERK_WEBHOOK_SECRET", env.CLERK_WEBHOOK_SECRET);
  const authorization = request.headers.get("authorization");
  const internalSecret = request.headers.get("x-internal-secret");

  return authorization === `Bearer ${secret}` || internalSecret === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.text();
  let input: unknown = {};
  if (body.trim()) {
    try {
      input = JSON.parse(body) as unknown;
    } catch {
      input = null;
    }
  }

  const parsed = processVariantsInputSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await processPendingImageAssetVariants({
    db,
    assetId: parsed.data.assetId,
    limit: parsed.data.limit,
    retryFailed: parsed.data.retryFailed,
  });

  return NextResponse.json(result);
}
