import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { env, requireEnv } from "@/env";

interface RevalidationPath {
  path: string;
  type?: "page" | "layout";
}

interface RevalidationTag {
  tag: string;
}

interface PublicCacheRevalidationPayload {
  source?: string;
  paths?: RevalidationPath[];
  tags?: RevalidationTag[];
}

function isValidPathTarget(value: unknown): value is RevalidationPath {
  if (!value || typeof value !== "object") return false;

  const target = value as Partial<RevalidationPath>;
  return (
    typeof target.path === "string" &&
    target.path.startsWith("/") &&
    (target.type === undefined ||
      target.type === "page" ||
      target.type === "layout")
  );
}

function isValidTagTarget(value: unknown): value is RevalidationTag {
  if (!value || typeof value !== "object") return false;

  const target = value as Partial<RevalidationTag>;
  return typeof target.tag === "string" && target.tag.length > 0;
}

function getPayload(value: unknown): PublicCacheRevalidationPayload | null {
  if (!value || typeof value !== "object") return null;

  const payload = value as PublicCacheRevalidationPayload;
  const paths = payload.paths ?? [];
  const tags = payload.tags ?? [];

  if (!Array.isArray(paths) || !Array.isArray(tags)) return null;
  if (!paths.every(isValidPathTarget)) return null;
  if (!tags.every(isValidTagTarget)) return null;

  return { source: payload.source, paths, tags };
}

export async function POST(req: Request) {
  const secret = requireEnv("CLERK_WEBHOOK_SECRET", env.CLERK_WEBHOOK_SECRET);
  const authorization = req.headers.get("authorization");

  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = getPayload(await req.json());
  if (!payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  for (const pathTarget of payload.paths ?? []) {
    if (pathTarget.type) {
      revalidatePath(pathTarget.path, pathTarget.type);
    } else {
      revalidatePath(pathTarget.path);
    }
  }

  for (const tagTarget of payload.tags ?? []) {
    revalidateTag(tagTarget.tag, "max");
  }

  return NextResponse.json({
    revalidated: true,
    paths: payload.paths?.length ?? 0,
    tags: payload.tags?.length ?? 0,
  });
}
