import { type NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { env } from "@/env";

const revalidateRequestBodySchema = z.object({
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
      return;
    }

    revalidatePath(entry.path);
  });

  return NextResponse.json({ ok: true });
}
