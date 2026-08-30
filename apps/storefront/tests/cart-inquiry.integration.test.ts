import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { calculateShipping } from "@/lib/shipping";
import { POST as postForm } from "@/app/api/forms/route";
import {
  RemoteInquiryAdapter,
  StubInquiryAdapter,
} from "@/server/inquiries/inquiry-adapter";
import { createInquiryHandler } from "@/server/inquiries/inquiry-handler";
import { validateCartInquiry } from "@/server/inquiries/validate-cart-inquiry";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function postJson(value: unknown, headers: HeadersInit = {}) {
  return new Request("https://storefront.test/api/forms", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(value),
  });
}

function openedAt() {
  return new Date(Date.now() - 2_000).toISOString();
}

describe("inquiry integration", () => {
  it("fails closed for unsafe remote inquiry configuration", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STOREFRONT_SITE_KEY", "rolling-oaks");
    vi.stubEnv("STOREFRONT_HOSTNAME", "rolling-oaks-daylilies.makon.dev");
    vi.stubEnv("STOREFRONT_SELLER_ID", "3");
    vi.stubEnv("STOREFRONT_DATA_SOURCE", "remote");
    vi.stubEnv("STOREFRONT_API_BASE_URL", "https://daylilycatalog.com");
    vi.stubEnv("STOREFRONT_INQUIRY_ADAPTER", "stub");

    const stubResponse = await postForm(
      postJson({
        kind: "contact",
        name: "Garden Visitor",
        email: "visitor@example.com",
        message: "Can I plan a garden visit?",
        website: "",
        openedAt: openedAt(),
      }),
    );

    expect(stubResponse.status).toBe(503);
    expect(stubResponse.headers.get("cache-control")).toBe("no-store");
    await expect(stubResponse.json()).resolves.toEqual({
      error: "Inquiry delivery is unavailable.",
    });

    const fetchImplementation = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchImplementation);
    vi.stubEnv("STOREFRONT_INQUIRY_ADAPTER", "remote");
    vi.stubEnv("STOREFRONT_INQUIRY_TOKEN", "");

    const missingUrlResponse = await postForm(
      postJson({
        kind: "contact",
        name: "Garden Visitor",
        email: "visitor@example.com",
        message: "Can I plan a garden visit?",
        website: "",
        openedAt: openedAt(),
      }),
    );

    expect(missingUrlResponse.status).toBe(503);
    expect(missingUrlResponse.headers.get("cache-control")).toBe("no-store");
    await expect(missingUrlResponse.json()).resolves.toEqual({
      error: "Inquiry delivery is unavailable.",
    });

    vi.stubEnv("STOREFRONT_INQUIRY_TOKEN", "test-token");
    vi.stubEnv("STOREFRONT_API_BASE_URL", "not-an-absolute-url");

    const invalidUrlResponse = await postForm(
      postJson({
        kind: "contact",
        name: "Garden Visitor",
        email: "visitor@example.com",
        message: "Can I plan a garden visit?",
        website: "",
        openedAt: openedAt(),
      }),
    );

    expect(invalidUrlResponse.status).toBe(503);
    expect(invalidUrlResponse.headers.get("cache-control")).toBe("no-store");
    await expect(invalidUrlResponse.json()).resolves.toEqual({
      error: "Inquiry delivery is unavailable.",
    });

    expect(fetchImplementation).not.toHaveBeenCalled();

    vi.stubEnv("STOREFRONT_API_BASE_URL", "https://daylilycatalog.com/root");
    fetchImplementation.mockResolvedValueOnce(
      Response.json(
        { id: "inquiry-1", acceptedAt: "2026-08-29T19:00:00.000Z" },
        { status: 202 },
      ),
    );
    const delivered = await postForm(
      postJson({
        kind: "contact",
        name: "Garden Visitor",
        email: "visitor@example.com",
        message: "Can I plan a garden visit?",
        website: "",
        openedAt: openedAt(),
      }),
    );
    expect(delivered.status).toBe(202);
    expect(fetchImplementation).toHaveBeenCalledWith(
      "https://daylilycatalog.com/api/v1/storefronts/3/inquiries",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("forwards only a valid trusted client IP and preserves receiver conflicts and rate limits", async () => {
    const inquiry = {
      kind: "contact",
      name: "Garden Visitor",
      email: "visitor@example.com",
      message: "Can I plan a garden visit?",
      website: "",
      openedAt: openedAt(),
    } as const;
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 429,
          headers: { "Retry-After": "60" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 409 }));
    vi.stubGlobal("fetch", fetchImplementation);
    const adapter = new RemoteInquiryAdapter(
      "https://daylilycatalog.com/api/v1/storefronts/3/inquiries",
      "seller-token",
    );

    const rateLimited = await createInquiryHandler(adapter)(
      postJson(inquiry, {
        "cf-connecting-ip": "2001:db8::1",
        "x-forwarded-for": "198.51.100.9",
        "x-storefront-client-ip": "203.0.113.7",
      }),
    );
    expect(rateLimited.status).toBe(429);
    expect(rateLimited.headers.get("retry-after")).toBe("60");
    const firstHeaders = new Headers(
      fetchImplementation.mock.calls[0]![1]?.headers,
    );
    expect(firstHeaders.get("authorization")).toBe("Bearer seller-token");
    expect(firstHeaders.get("x-storefront-client-ip")).toBe("2001:db8::1");

    const conflict = await createInquiryHandler(adapter)(
      postJson(inquiry, { "cf-connecting-ip": "198.51.100.1, 198.51.100.2" }),
    );
    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toEqual({
      code: "cart_changed",
      error:
        "One or more cart listings changed. Refresh the cart and try again.",
    });
    const secondHeaders = new Headers(
      fetchImplementation.mock.calls[1]![1]?.headers,
    );
    expect(secondHeaders.get("x-storefront-client-ip")).toBeNull();
  });

  it("rejects malformed remote delivery receipts", async () => {
    const request = {
      kind: "contact",
      name: "Garden Visitor",
      email: "visitor@example.com",
      message: "Can I plan a garden visit?",
      website: "",
      openedAt: openedAt(),
    } as const;
    const invalidReceipts = [
      { id: 12, acceptedAt: "2026-08-29T19:00:00.000Z" },
      { id: "receipt-1", acceptedAt: "yesterday" },
      {
        id: "receipt-1",
        acceptedAt: "2026-08-29T19:00:00.000Z",
        internalDeliveryId: "private-1",
      },
    ];

    for (const receipt of invalidReceipts) {
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>().mockResolvedValue(
          Response.json(receipt, {
            status: 202,
          }),
        ),
      );
      const adapter = new RemoteInquiryAdapter(
        "https://inquiries.example.test/v1/storefront",
      );

      await expect(adapter.deliver(request)).rejects.toThrow(
        "Inquiry delivery returned an invalid receipt.",
      );
    }

    for (const status of [200, 204]) {
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>().mockResolvedValue(
          status === 204
            ? new Response(null, { status })
            : Response.json(
                {
                  id: "receipt-1",
                  acceptedAt: "2026-08-29T19:00:00.000Z",
                },
                { status },
              ),
        ),
      );
      const adapter = new RemoteInquiryAdapter(
        "https://daylilycatalog.com/api/v1/storefronts/3/inquiries",
      );
      await expect(adapter.deliver(request)).rejects.toThrow(
        `unexpected status ${status}`,
      );
    }
  });

  it("delivers a valid contact inquiry through the stub without touching the cart", async () => {
    const adapter = new StubInquiryAdapter();
    const response = await createInquiryHandler(adapter)(
      postJson({
        kind: "contact",
        name: "Garden Visitor",
        email: "visitor@example.com",
        message: "Can I plan a garden visit?",
        website: "",
        openedAt: openedAt(),
      }),
    );

    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(adapter.deliveries).toHaveLength(1);
    expect(adapter.deliveries[0]).toMatchObject({ kind: "contact" });

    const missingMessage = await createInquiryHandler(adapter)(
      postJson({
        kind: "contact",
        name: "Garden Visitor",
        email: "visitor@example.com",
        message: "",
        website: "",
        openedAt: openedAt(),
      }),
    );
    expect(missingMessage.status).toBe(422);
    expect(adapter.deliveries).toHaveLength(1);
  });

  it("accepts honeypot spam without sending it to an adapter", async () => {
    const adapter = new StubInquiryAdapter();
    const response = await createInquiryHandler(adapter)(
      postJson({
        kind: "contact",
        name: "Bot",
        email: "bot@example.com",
        message: "Read www.one.example and www.two.example",
        website: "",
        openedAt: openedAt(),
      }),
    );

    expect(response.status).toBe(202);
    expect(adapter.deliveries).toHaveLength(0);

    const oneLinkResponse = await createInquiryHandler(adapter)(
      postJson({
        kind: "contact",
        name: "Garden Visitor",
        email: "visitor@example.com",
        message: "Read https://www.example.com/daylilies",
        website: "",
        openedAt: openedAt(),
      }),
    );
    expect(oneLinkResponse.status).toBe(202);
    expect(adapter.deliveries).toHaveLength(1);
  });

  it("reports an expired form instead of returning a false success", async () => {
    const adapter = new StubInquiryAdapter();
    const response = await createInquiryHandler(adapter)(
      postJson({
        kind: "contact",
        name: "Garden Visitor",
        email: "visitor@example.com",
        message: "Can I plan a garden visit?",
        website: "",
        openedAt: new Date(Date.now() - 2 * 60 * 60 * 1_000 - 1).toISOString(),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: "form_expired",
      error: "This form expired. Review it and send it again.",
    });
    expect(adapter.deliveries).toHaveLength(0);
  });

  it("uses catalog prices and shipping when it validates a cart inquiry", async () => {
    vi.stubEnv("STOREFRONT_DATA_SOURCE", "fixture");
    vi.stubEnv("STOREFRONT_SITE_KEY", "rolling-oaks");
    const adapter = new StubInquiryAdapter();
    const validCart = {
      kind: "cart",
      name: "Daylily Buyer",
      email: "buyer@example.com",
      message: "Please confirm availability.",
      website: "",
      openedAt: openedAt(),
      lines: [
        {
          listingId: "listing-boundary-twenty",
          slug: "boundary-twenty",
          title: "Boundary Twenty",
          quantity: 1,
          unitPrice: 20,
        },
      ],
      subtotal: 20,
      shipping: 15,
      total: 35,
    } as const;

    const response = await createInquiryHandler(
      adapter,
      validateCartInquiry,
    )(postJson(validCart));
    expect(response.status).toBe(202);
    expect(adapter.deliveries).toHaveLength(1);

    const tampered = structuredClone(validCart) as unknown as Record<
      string,
      unknown
    >;
    const lines = tampered.lines as Array<Record<string, unknown>>;
    lines[0]!.unitPrice = 1;
    tampered.subtotal = 1;
    tampered.total = 16;
    const rejected = await createInquiryHandler(
      adapter,
      validateCartInquiry,
    )(postJson(tampered));
    expect(rejected.status).toBe(409);
    await expect(rejected.json()).resolves.toMatchObject({
      code: "cart_changed",
    });
    expect(adapter.deliveries).toHaveLength(1);

    const belowMinimum = {
      ...validCart,
      lines: [
        {
          listingId: "listing-alpine-glow",
          slug: "alpine-glow",
          title: "Alpine Glow",
          quantity: 1,
          unitPrice: 9.99,
        },
      ],
      subtotal: 9.99,
      shipping: 15,
      total: 24.99,
    } as const;
    const acceptedBelowMinimum = await createInquiryHandler(
      adapter,
      validateCartInquiry,
    )(postJson(belowMinimum));
    expect(acceptedBelowMinimum.status).toBe(202);
    expect(adapter.deliveries).toHaveLength(2);
  });

  it("uses continuous shipping boundaries", () => {
    const policy = { baseItems: 3, baseRate: 15, additionalItemRate: 1.5 };
    expect(calculateShipping(0, policy)).toBe(0);
    expect(calculateShipping(3, policy)).toBe(15);
    expect(calculateShipping(4, policy)).toBe(16.5);
  });
});
