import { type NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { env } from "@/env";
import { trackPublicIsrPathInvalidation } from "@/server/analytics/public-isr-posthog";

const revalidateRequestBodySchema = z.object({
  source: z.string().min(1),
  paths: z.array(
    z.object({
      path: z.string().min(1),
      type: z.enum(["page", "layout"]).optional(),
    }),
  ),
});

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${env.CLERK_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody: unknown = await request.json().catch(() => null);
  const parsedBody = revalidateRequestBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

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
