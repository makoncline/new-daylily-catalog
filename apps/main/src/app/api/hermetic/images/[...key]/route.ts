import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isHermeticMode } from "@/lib/hermetic/runtime.js";

function resolveImagePath(keyParts: string[]) {
  const root = path.resolve(process.cwd(), "tests", ".tmp", "hermetic-images");
  const filePath = path.resolve(root, ...keyParts);
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid hermetic image path.");
  }
  return filePath;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  if (!isHermeticMode()) return new NextResponse(null, { status: 404 });
  const { key } = await params;
  const filePath = resolveImagePath(key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(await request.arrayBuffer()));
  return new NextResponse(null, { status: 204 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  if (!isHermeticMode()) return new NextResponse(null, { status: 404 });
  try {
    const { key } = await params;
    const filePath = resolveImagePath(key);
    const body = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const contentType =
      extension === ".png"
        ? "image/png"
        : extension === ".webp"
          ? "image/webp"
          : "image/jpeg";
    return new NextResponse(body, {
      headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
