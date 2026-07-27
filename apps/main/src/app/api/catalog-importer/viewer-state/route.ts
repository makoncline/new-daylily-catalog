import { NextResponse } from "next/server";
import type { CatalogImporterViewerState } from "@/lib/catalog-importer-membership";
import { getClerk } from "@/server/clerk/client";
import { db } from "@/server/db";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";
import { getStripeSubscriptionResult } from "@/server/stripe/sync-subscription";

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};

function hasClerkSessionCookie(request: Request) {
  return /(?:^|;\s*)__session(?:_[^=;\s]+)?=/.test(
    request.headers.get("cookie") ?? "",
  );
}

async function getClerkUserId(request: Request) {
  if (!hasClerkSessionCookie(request)) {
    return null;
  }

  const requestState = await (await getClerk()).authenticateRequest(request);
  const authObject = requestState.toAuth();
  return authObject?.isAuthenticated === true && "userId" in authObject
    ? authObject.userId
    : null;
}

export async function GET(request: Request) {
  const userId = await getClerkUserId(request);
  let viewerState: CatalogImporterViewerState = "anonymous";

  if (userId) {
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      select: { stripeCustomerId: true },
    });
    viewerState = "signed_in_nonpro";

    if (user?.stripeCustomerId) {
      const result = await getStripeSubscriptionResult(user.stripeCustomerId);
      if (
        result.confirmed &&
        hasActiveSubscription(result.subscription.status)
      ) {
        viewerState = "pro";
      }
    }
  }

  return NextResponse.json(
    { viewerState },
    { headers: PRIVATE_NO_STORE_HEADERS },
  );
}
