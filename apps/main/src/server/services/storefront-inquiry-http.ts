import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { z } from "zod";
import type {
  SendPublicInquiryInput,
  SendPublicInquiryOptions,
} from "@/server/services/public-inquiry";
import { PUBLIC_INQUIRY_RATE_LIMIT } from "@/server/services/public-inquiry-rate-limit-config";
import { storefrontSellerIdSchema } from "@/server/services/storefront-inquiry-credentials";

export const STOREFRONT_CLIENT_IP_HEADER = "x-storefront-client-ip";

const inquiryPersonSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
    message: z.string().trim().max(5_000).default(""),
    website: z.string().max(500).optional().default(""),
    openedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

const cartLineSchema = z
  .object({
    listingId: z.string().min(1).max(100),
    slug: z.string().min(1).max(200),
    title: z.string().min(1).max(300),
    quantity: z.number().int().positive().max(100),
    unitPrice: z.number().positive(),
  })
  .strict();

export const storefrontInquirySchema = z.discriminatedUnion("kind", [
  inquiryPersonSchema
    .extend({
      kind: z.literal("contact"),
      message: z.string().trim().min(1).max(5_000),
    })
    .strict(),
  inquiryPersonSchema
    .extend({
      kind: z.literal("cart"),
      lines: z.array(cartLineSchema).min(1).max(100),
      subtotal: z.number().nonnegative(),
      shipping: z.number().nonnegative(),
      total: z.number().positive(),
    })
    .strict(),
]);

interface InquiryReceipt {
  id: string;
  acceptedAt: string;
}

type SendInquiry = (
  input: SendPublicInquiryInput,
  options?: SendPublicInquiryOptions,
) => Promise<unknown>;

export interface StorefrontInquiryHandlerDependencies {
  createReceipt?: () => InquiryReceipt;
  getToken: (
    sellerId: string,
  ) => string | undefined | Promise<string | undefined>;
  isSellerApproved: (sellerId: string) => boolean | Promise<boolean>;
  sendInquiry: SendInquiry;
}

interface StorefrontInquiryRouteInput {
  sellerId: string;
}

function privateJson(body: unknown, status: number, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Cache-Control", "no-store");

  return Response.json(body, { status, headers: responseHeaders });
}

function getBearerToken(authorization: string | null) {
  const match = authorization?.match(/^Bearer ([^\s]+)$/iu);
  return match?.[1];
}

function tokenMatches(
  providedToken: string | undefined,
  expectedToken: string,
) {
  const providedDigest = createHash("sha256")
    .update(providedToken ?? "")
    .digest();
  const expectedDigest = createHash("sha256").update(expectedToken).digest();

  return (
    providedToken !== undefined &&
    timingSafeEqual(providedDigest, expectedDigest)
  );
}

function getRateLimitHeaders(requestHeaders: Headers) {
  const rawClientIp = requestHeaders.get(STOREFRONT_CLIENT_IP_HEADER);
  if (rawClientIp === null) {
    return { headers: new Headers() } as const;
  }

  const clientIp = rawClientIp.trim();
  if (!clientIp || isIP(clientIp) === 0) {
    return { error: "The storefront client IP header is invalid." } as const;
  }

  return {
    headers: new Headers({ "x-forwarded-for": clientIp }),
  } as const;
}

function toServiceInput(
  sellerId: string,
  inquiry: z.infer<typeof storefrontInquirySchema>,
): SendPublicInquiryInput {
  const baseInput = {
    userId: sellerId,
    customerEmail: inquiry.email,
    customerName: inquiry.name,
    message: inquiry.message,
  };

  if (inquiry.kind === "contact") {
    return baseInput;
  }

  return {
    ...baseInput,
    items: inquiry.lines.map((line) => ({
      id: line.listingId,
      listingId: line.listingId,
      title: line.title,
      price: line.unitPrice,
      quantity: line.quantity,
      userId: sellerId,
    })),
  };
}

function defaultReceipt(): InquiryReceipt {
  return {
    id: randomUUID(),
    acceptedAt: new Date().toISOString(),
  };
}

export function createStorefrontInquiryHandler(
  dependencies: StorefrontInquiryHandlerDependencies,
) {
  return async function handleStorefrontInquiry(
    request: Request,
    routeInput: StorefrontInquiryRouteInput,
  ): Promise<Response> {
    const sellerIdResult = storefrontSellerIdSchema.safeParse(
      routeInput.sellerId,
    );
    if (!sellerIdResult.success) {
      return privateJson({ error: "invalid_seller_id" }, 400);
    }

    let isSellerApproved: boolean;
    try {
      isSellerApproved = await dependencies.isSellerApproved(
        sellerIdResult.data,
      );
    } catch {
      return privateJson({ error: "storefront_inquiry_unavailable" }, 503);
    }
    if (!isSellerApproved) {
      return privateJson({ error: "storefront_not_found" }, 404);
    }

    let expectedToken: string | undefined;
    try {
      expectedToken = await dependencies.getToken(sellerIdResult.data);
    } catch {
      return privateJson({ error: "storefront_inquiry_unavailable" }, 503);
    }
    if (!expectedToken) {
      return privateJson({ error: "storefront_inquiry_unavailable" }, 503);
    }

    const providedToken = getBearerToken(request.headers.get("authorization"));
    if (!tokenMatches(providedToken, expectedToken)) {
      return privateJson({ error: "unauthorized" }, 401, {
        "WWW-Authenticate": "Bearer",
      });
    }

    const mediaType = request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase();
    if (mediaType !== "application/json" && !mediaType?.endsWith("+json")) {
      return privateJson({ error: "unsupported_media_type" }, 415);
    }

    const rateLimitHeaders = getRateLimitHeaders(request.headers);
    if ("error" in rateLimitHeaders) {
      return privateJson({ error: "invalid_client_ip" }, 400);
    }

    let value: unknown;
    try {
      value = await request.json();
    } catch {
      return privateJson({ error: "invalid_json" }, 400);
    }

    const inquiryResult = storefrontInquirySchema.safeParse(value);
    if (!inquiryResult.success) {
      return privateJson(
        {
          error: "invalid_inquiry",
          issues: inquiryResult.error.flatten(),
        },
        422,
      );
    }

    try {
      await dependencies.sendInquiry(
        toServiceInput(sellerIdResult.data, inquiryResult.data),
        { headers: rateLimitHeaders.headers },
      );

      const receipt = (dependencies.createReceipt ?? defaultReceipt)();
      return privateJson(
        { id: receipt.id, acceptedAt: receipt.acceptedAt },
        202,
      );
    } catch (error) {
      if (error instanceof TRPCError) {
        const status = getHTTPStatusCodeFromError(error);
        const isServerError = status >= 500;
        const headers =
          status === 429
            ? {
                "Retry-After": Math.ceil(
                  PUBLIC_INQUIRY_RATE_LIMIT.windowMs / 1_000,
                ).toString(),
              }
            : undefined;
        return privateJson(
          {
            error: error.code.toLowerCase(),
            message: isServerError
              ? "The inquiry could not be delivered."
              : error.message,
          },
          status,
          headers,
        );
      }

      return privateJson(
        {
          error: "internal_server_error",
          message: "The inquiry could not be delivered.",
        },
        500,
      );
    }
  };
}
