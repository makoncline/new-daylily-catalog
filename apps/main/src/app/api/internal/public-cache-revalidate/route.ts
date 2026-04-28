import { type NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { env, requireEnv } from "@/env";
import {
  trackPublicIsrPathInvalidation,
  trackPublicIsrTagInvalidation,
} from "@/server/analytics/public-isr-posthog";
import {
  createPublicIsrPlan,
  executePublicIsrPlan,
} from "@/server/api/routers/dashboard-db/public-isr-invalidation-plan";

const revalidateRequestBodySchema = z.object({
  source: z.string().min(1),
  paths: z.array(
    z.object({
      path: z.string().min(1),
      type: z.enum(["page", "layout"]).optional(),
    }),
  ),
  tags: z
    .array(
      z.object({
        tag: z.string().min(1),
        profile: z.enum(["expire:0", "max"]).optional(),
      }),
    )
    .default([]),
});

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (
    authorization !==
    `Bearer ${requireEnv("CLERK_WEBHOOK_SECRET", env.CLERK_WEBHOOK_SECRET)}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody: unknown = await request.json().catch(() => null);
  const parsedBody = revalidateRequestBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const plan = createPublicIsrPlan({
    paths: parsedBody.data.paths,
    source: parsedBody.data.source,
    tags: parsedBody.data.tags,
  });

  executePublicIsrPlan({
    handlers: {
      revalidatePath: (path, type) => {
        if (type) {
          revalidatePath(path, type);
          return true;
        }

        revalidatePath(path);
        return true;
      },
      revalidateTag: (tag, profile) => {
        revalidateTag(tag, profile);
        return true;
      },
      trackPathInvalidation: trackPublicIsrPathInvalidation,
      trackTagInvalidation: trackPublicIsrTagInvalidation,
    },
    plan,
    sourcePage: "/api/internal/public-cache-revalidate",
    transport: "internal-route",
  });

  return NextResponse.json({ ok: true });
}
