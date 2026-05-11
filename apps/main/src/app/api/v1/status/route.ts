import { NextResponse } from "next/server";
import {
  getPublicSearchApiDisabledResponse,
  isPublicSearchApiEnabled,
} from "@/server/search/public-search-api-platform";
import { getPublicParentageIndexStatus } from "@/server/search/public-parentage-index";
import {
  ensurePublicSearchIndex,
} from "@/server/search/public-search-index";

export const runtime = "nodejs";

export async function GET() {
  if (!isPublicSearchApiEnabled()) {
    return getPublicSearchApiDisabledResponse();
  }

  const [status, parentageStatus] = await Promise.all([
    ensurePublicSearchIndex(),
    getPublicParentageIndexStatus(),
  ]);

  return NextResponse.json({
    ok: status.exists,
    parentageIndex: parentageStatus,
    searchIndex: status,
  });
}
