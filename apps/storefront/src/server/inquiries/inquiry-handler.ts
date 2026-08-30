import {
  getTrustedClientIp,
  InquiryConflictError,
  type InquiryAdapter,
  InquiryRateLimitError,
} from "./inquiry-adapter";
import {
  inquirySchema,
  inquiryConflictCode,
  isInquiryExpired,
  isLikelySpam,
  type CartInquiry,
} from "./inquiry-schema";

type ValidateCartInquiry = (inquiry: CartInquiry) => Promise<CartInquiry>;

function privateJson(
  body: unknown,
  status: number,
  extraHeaders: HeadersInit = {},
) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
}

export function createInquiryHandler(
  adapter: InquiryAdapter,
  validateCartInquiry: ValidateCartInquiry = async (inquiry) => inquiry,
) {
  return async function handleInquiry(request: Request): Promise<Response> {
    let value: unknown;
    try {
      value = await request.json();
    } catch {
      return privateJson({ error: "Request body must be valid JSON." }, 400);
    }

    const result = inquirySchema.safeParse(value);
    if (!result.success) {
      return privateJson(
        {
          error: "Check the inquiry fields and try again.",
          issues: result.error.flatten(),
        },
        422,
      );
    }

    if (isInquiryExpired(result.data)) {
      return privateJson(
        {
          code: inquiryConflictCode.formExpired,
          error: "This form expired. Review it and send it again.",
        },
        409,
      );
    }

    if (isLikelySpam(result.data)) {
      return privateJson({ accepted: true }, 202);
    }

    try {
      const inquiry =
        result.data.kind === "cart"
          ? await validateCartInquiry(result.data)
          : result.data;
      const receipt = await adapter.deliver(inquiry, {
        clientIp: getTrustedClientIp(request),
      });
      return privateJson({ accepted: true, receipt }, 202);
    } catch (error) {
      if (error instanceof InvalidCartInquiryError) {
        return privateJson(
          { code: inquiryConflictCode.cartChanged, error: error.message },
          409,
        );
      }
      if (error instanceof InquiryConflictError) {
        return privateJson(
          {
            code: inquiryConflictCode.cartChanged,
            error:
              "One or more cart listings changed. Refresh the cart and try again.",
          },
          409,
        );
      }
      if (error instanceof InquiryRateLimitError) {
        return privateJson(
          { error: "Too many inquiry requests. Try again later." },
          429,
          error.retryAfter ? { "Retry-After": error.retryAfter } : {},
        );
      }
      return privateJson(
        { error: "The inquiry could not be delivered. Try again later." },
        502,
      );
    }
  };
}

export class InvalidCartInquiryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCartInquiryError";
  }
}
