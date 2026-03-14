import { type NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { env, requireEnv } from "@/env";
import {
  trackPublicIsrPathInvalidation,
  trackPublicIsrTagInvalidation,
} from "@/server/analytics/public-isr-posthog";

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

function toNextTagProfile(profile: "expire:0" | "max" | undefined) {
  if (profile === "max") {
    return "max";
  }

  return { expire: 0 } as const;
}

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

  parsedBody.data.tags.forEach((entry) => {
    const profile = entry.profile ?? "expire:0";
    revalidateTag(entry.tag, toNextTagProfile(profile));
    trackPublicIsrTagInvalidation({
      profile,
      sourcePage: "/api/internal/public-cache-revalidate",
      tag: entry.tag,
      transport: "internal-route",
      triggerSource: parsedBody.data.source,
    });
  });

  parsedBody.data.paths.forEach((entry) => {
    if (entry.type) {
      revalidatePath(entry.path, entry.type);
      trackPublicIsrPathInvalidation({
        path: entry.path,
        sourcePage: "/api/internal/public-cache-revalidate",
        transport: "internal-route",
        triggerSource: parsedBody.data.source,
        type: entry.type,
      });
      return;
    }

    revalidatePath(entry.path);
    trackPublicIsrPathInvalidation({
      path: entry.path,
      sourcePage: "/api/internal/public-cache-revalidate",
      transport: "internal-route",
      triggerSource: parsedBody.data.source,
    });
  });

  return NextResponse.json({ ok: true });
}
