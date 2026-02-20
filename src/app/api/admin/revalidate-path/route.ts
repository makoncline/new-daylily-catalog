import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const revalidatePathInputSchema = z.object({
  path: z.string().trim().min(1).max(2048),
});

function toNormalizedPath(path: string) {
  if (!path.startsWith("/")) {
    return null;
  }

  if (path.startsWith("//")) {
    return null;
  }

  const parsedUrl = new URL(path, "https://daylilycatalog.local");
  const pathname = parsedUrl.pathname;

  if (!pathname.startsWith("/") || pathname.startsWith("/api")) {
    return null;
  }

  return pathname;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = revalidatePathInputSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!input.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const normalizedPath = toNormalizedPath(input.data.path);

  if (!normalizedPath) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  revalidatePath(normalizedPath);

  return NextResponse.json({
    ok: true,
    revalidatedPath: normalizedPath,
  });
}
