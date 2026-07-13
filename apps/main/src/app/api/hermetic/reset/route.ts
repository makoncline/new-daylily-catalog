import { NextResponse } from "next/server";
import { isHermeticMode } from "@/lib/hermetic/runtime.js";
import { resetHermeticData } from "@/lib/hermetic/seed";
import { db } from "@/server/db";

export async function POST() {
  if (!isHermeticMode()) return new NextResponse(null, { status: 404 });
  await resetHermeticData(db);
  const resetStripeSimulator = (
    globalThis as typeof globalThis & {
      __daylilyResetIntegrationStripeState?: () => void;
    }
  ).__daylilyResetIntegrationStripeState;
  resetStripeSimulator?.();
  return NextResponse.json({ reset: true });
}
