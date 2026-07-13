import { NextResponse } from "next/server";
import { isHermeticMode } from "@/lib/hermetic/runtime.js";
import { db } from "@/server/db";

export async function GET() {
  if (!isHermeticMode()) return new NextResponse(null, { status: 404 });
  const rows = await db.keyValue.findMany({
    where: { key: { startsWith: "hermetic:event:" } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    events: rows.map((row) => ({
      id: row.key,
      ...(JSON.parse(row.value) as Record<string, unknown>),
    })),
  });
}
