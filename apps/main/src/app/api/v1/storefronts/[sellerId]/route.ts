import { reportError } from "@/lib/error-utils";
import { getPublicStorefrontResponse } from "@/server/storefront/public-storefront-http";
import { getPublicStorefrontSnapshot } from "@/server/storefront/public-storefront-read-model";

export const runtime = "nodejs";

interface PublicStorefrontRouteContext {
  params: Promise<{
    sellerId: string;
  }>;
}

function getErrorResponse(
  status: 404 | 500,
  error: "storefront_not_found" | "internal_server_error",
  message: string,
) {
  return Response.json(
    {
      error,
      message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function GET(
  request: Request,
  context: PublicStorefrontRouteContext,
) {
  const { sellerId } = await context.params;

  try {
    const snapshot = await getPublicStorefrontSnapshot(sellerId);
    if (!snapshot) {
      return getErrorResponse(
        404,
        "storefront_not_found",
        "Storefront not found.",
      );
    }

    return getPublicStorefrontResponse(request, snapshot);
  } catch (error) {
    reportError({
      error,
      context: {
        sellerId,
        source: "public-storefront-api",
      },
    });

    return getErrorResponse(
      500,
      "internal_server_error",
      "Storefront could not be loaded.",
    );
  }
}
