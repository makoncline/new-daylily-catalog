import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const revalidatePathQuerySchema = z.object({
  path: z.string().trim().min(1).max(2048),
});

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

function toIsoTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString();
}

function getEstimatedCachedAtIso({
  responseDate,
  responseAge,
  lastModified,
}: {
  responseDate: string | null;
  responseAge: string | null;
  lastModified: string | null;
}) {
  const lastModifiedIso = toIsoTimestamp(lastModified);

  if (lastModifiedIso) {
    return {
      cachedAtIso: lastModifiedIso,
      cachedAtSource: "last-modified",
    } as const;
  }

  if (!responseDate || !responseAge) {
    return {
      cachedAtIso: null,
      cachedAtSource: null,
    } as const;
  }

  const parsedDateMs = Date.parse(responseDate);
  const parsedAgeSeconds = Number.parseInt(responseAge, 10);

  if (Number.isNaN(parsedDateMs) || Number.isNaN(parsedAgeSeconds)) {
    return {
      cachedAtIso: null,
      cachedAtSource: null,
    } as const;
  }

  const estimatedCachedAt = new Date(parsedDateMs - parsedAgeSeconds * 1000);

  return {
    cachedAtIso: estimatedCachedAt.toISOString(),
    cachedAtSource: "date-age",
  } as const;
}

async function requireAuthenticatedUser() {
  const session = await auth();

  if (!session.userId) {
    return null;
  }

  return session.userId;
}

export async function POST(request: Request) {
  const userId = await requireAuthenticatedUser();

  if (!userId) {
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

export async function GET(request: Request) {
  const userId = await requireAuthenticatedUser();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const queryInput = revalidatePathQuerySchema.safeParse({
    path: requestUrl.searchParams.get("path"),
  });

  if (!queryInput.success) {
    return NextResponse.json({ error: "Invalid path query" }, { status: 400 });
  }

  const normalizedPath = toNormalizedPath(queryInput.data.path);

  if (!normalizedPath) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const probeUrl = new URL(normalizedPath, request.url);
  probeUrl.search = "";
  probeUrl.hash = "";

  try {
    const response = await fetch(probeUrl, {
      method: "HEAD",
      cache: "no-store",
      headers: {
        "x-admin-cache-probe": "1",
      },
    });

    const responseDate = response.headers.get("date");
    const responseAge = response.headers.get("age");
    const lastModified = response.headers.get("last-modified");
    const estimatedCachedAt = getEstimatedCachedAtIso({
      responseDate,
      responseAge,
      lastModified,
    });

    return NextResponse.json({
      ok: true,
      path: normalizedPath,
      probeStatus: response.status,
      cacheStatus:
        response.headers.get("x-nextjs-cache") ??
        response.headers.get("x-vercel-cache"),
      cacheControl: response.headers.get("cache-control"),
      responseDate,
      responseAge,
      lastModified,
      cachedAtIso: estimatedCachedAt.cachedAtIso,
      cachedAtSource: estimatedCachedAt.cachedAtSource,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to probe current page cache metadata",
      },
      { status: 502 },
    );
  }
}
