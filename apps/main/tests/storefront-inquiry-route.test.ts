// @vitest-environment node

import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getConfiguredStorefrontInquiryToken,
  isConfiguredStorefrontSeller,
} from "@/server/services/storefront-inquiry-credentials";
import {
  createStorefrontInquiryHandler,
  STOREFRONT_CLIENT_IP_HEADER,
} from "@/server/services/storefront-inquiry-http";

const TOKEN = "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE";
const OTHER_TOKEN = "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI";
const TOKEN_MAP = JSON.stringify({ "3": TOKEN });
const RECEIPT = {
  id: "inquiry-123",
  acceptedAt: "2026-08-29T18:30:00.000Z",
};

const contactInquiry = {
  kind: "contact",
  name: "  Buyer Name  ",
  email: "buyer@example.com",
  message: "  Do you ship this cultivar?  ",
  website: "",
  openedAt: "2026-08-29T18:29:00.000Z",
} as const;

const cartInquiry = {
  kind: "cart",
  name: "Buyer Name",
  email: "buyer@example.com",
  message: "",
  website: "",
  openedAt: "2026-08-29T18:29:00.000Z",
  lines: [
    {
      listingId: "listing-1",
      slug: "starman",
      title: "Client title",
      quantity: 2,
      unitPrice: 25,
    },
  ],
  subtotal: 50,
  shipping: 15,
  total: 65,
} as const;

function createRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request(
    "https://daylilycatalog.com/api/v1/storefronts/3/inquiries",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${TOKEN}`,
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    },
  );
}

describe("storefront inquiry route", () => {
  const sendInquiry = vi.fn();
  const isSellerApproved = vi.fn<(sellerId: string) => boolean>();
  const handler = createStorefrontInquiryHandler({
    createReceipt: () => RECEIPT,
    getToken: (sellerId) =>
      getConfiguredStorefrontInquiryToken(sellerId, TOKEN_MAP, "3"),
    isSellerApproved,
    sendInquiry,
  });

  beforeEach(() => {
    sendInquiry.mockReset();
    sendInquiry.mockResolvedValue({ success: true });
    isSellerApproved.mockReset();
    isSellerApproved.mockImplementation((sellerId) =>
      isConfiguredStorefrontSeller(sellerId, "3"),
    );
  });

  it("rejects missing, malformed, and incorrect bearer tokens before delivery", async () => {
    const authorizationValues = [undefined, "Basic abc", "Bearer wrong-token"];

    for (const authorization of authorizationValues) {
      const headers = new Headers({
        "content-type": "application/json",
        [STOREFRONT_CLIENT_IP_HEADER]: "not-an-ip",
      });
      if (authorization) headers.set("authorization", authorization);
      const response = await handler(
        new Request(
          "https://daylilycatalog.com/api/v1/storefronts/3/inquiries",
          {
            method: "POST",
            headers,
            body: JSON.stringify(contactInquiry),
          },
        ),
        { sellerId: "3" },
      );

      expect(response.status).toBe(401);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    }

    expect(sendInquiry).not.toHaveBeenCalled();
  });

  it("fails closed when approved-seller credentials are missing or invalid", async () => {
    const unavailableHandler = createStorefrontInquiryHandler({
      getToken: (sellerId) =>
        getConfiguredStorefrontInquiryToken(sellerId, TOKEN_MAP, "3,4"),
      isSellerApproved: (sellerId) =>
        isConfiguredStorefrontSeller(sellerId, "3,4"),
      sendInquiry,
    });
    const missingTokenResponse = await unavailableHandler(
      createRequest(contactInquiry),
      { sellerId: "4" },
    );
    const malformedConfigHandler = createStorefrontInquiryHandler({
      getToken: (sellerId) =>
        getConfiguredStorefrontInquiryToken(sellerId, "[]", "3"),
      isSellerApproved: (sellerId) =>
        isConfiguredStorefrontSeller(sellerId, "3"),
      sendInquiry,
    });
    const malformedConfigResponse = await malformedConfigHandler(
      createRequest(contactInquiry),
      { sellerId: "3" },
    );

    for (const response of [missingTokenResponse, malformedConfigResponse]) {
      expect(response.status).toBe(503);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    }

    expect(sendInquiry).not.toHaveBeenCalled();
  });

  it("does not accept one approved seller's token for another seller", async () => {
    const sellerBoundHandler = createStorefrontInquiryHandler({
      getToken: (sellerId) =>
        getConfiguredStorefrontInquiryToken(
          sellerId,
          JSON.stringify({
            "3": TOKEN,
            "4": OTHER_TOKEN,
          }),
          "3,4",
        ),
      isSellerApproved: (sellerId) =>
        isConfiguredStorefrontSeller(sellerId, "3,4"),
      sendInquiry,
    });
    const response = await sellerBoundHandler(createRequest(contactInquiry), {
      sellerId: "4",
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(sendInquiry).not.toHaveBeenCalled();
  });

  it("rejects sellers outside the configured storefront allowlist before reading the inquiry", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await handler(
      createRequest({
        ...contactInquiry,
        message: "private message",
        website: "honeypot.example",
      }),
      { sellerId: "seller-not-approved" },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "storefront_not_found",
    });
    expect(isSellerApproved).toHaveBeenCalledWith("seller-not-approved");
    expect(sendInquiry).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("maps a contact inquiry and returns only the strict receipt", async () => {
    const response = await handler(
      createRequest(contactInquiry, {
        "x-forwarded-for": "198.51.100.99",
        "x-real-ip": "198.51.100.98",
        "cf-connecting-ip": "198.51.100.97",
      }),
      { sellerId: "3" },
    );

    expect(response.status).toBe(202);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(RECEIPT);
    expect(sendInquiry).toHaveBeenCalledWith(
      {
        userId: "3",
        customerEmail: "buyer@example.com",
        customerName: "Buyer Name",
        message: "Do you ship this cultivar?",
      },
      { headers: new Headers() },
    );
    expect(isSellerApproved).toHaveBeenCalledWith("3");
  });

  it("binds cart items to the route seller and forwards only the dedicated client IP", async () => {
    const response = await handler(
      createRequest(cartInquiry, {
        [STOREFRONT_CLIENT_IP_HEADER]: "203.0.113.10",
        "x-forwarded-for": "198.51.100.99",
        "x-real-ip": "198.51.100.98",
      }),
      { sellerId: "3" },
    );

    expect(response.status).toBe(202);
    expect(sendInquiry).toHaveBeenCalledWith(
      {
        userId: "3",
        customerEmail: "buyer@example.com",
        customerName: "Buyer Name",
        message: "",
        items: [
          {
            id: "listing-1",
            listingId: "listing-1",
            title: "Client title",
            price: 25,
            quantity: 2,
            userId: "3",
          },
        ],
      },
      { headers: new Headers({ "x-forwarded-for": "203.0.113.10" }) },
    );
  });

  it("rejects invalid inquiry data and invalid dedicated client IP values", async () => {
    const invalidInquiryResponse = await handler(
      createRequest({ ...contactInquiry, message: "" }),
      { sellerId: "3" },
    );
    const invalidIpResponse = await handler(
      createRequest(contactInquiry, {
        [STOREFRONT_CLIENT_IP_HEADER]: "203.0.113.10, 198.51.100.1",
      }),
      { sellerId: "3" },
    );

    expect(invalidInquiryResponse.status).toBe(422);
    expect(invalidInquiryResponse.headers.get("Cache-Control")).toBe(
      "no-store",
    );
    expect(invalidIpResponse.status).toBe(400);
    expect(invalidIpResponse.headers.get("Cache-Control")).toBe("no-store");
    expect(sendInquiry).not.toHaveBeenCalled();
  });

  it("maps rate-limit and service errors to HTTP responses without caching", async () => {
    sendInquiry.mockRejectedValueOnce(
      new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many inquiries. Please try again later.",
      }),
    );
    const limitedResponse = await handler(createRequest(contactInquiry), {
      sellerId: "3",
    });

    sendInquiry.mockRejectedValueOnce(new Error("provider detail"));
    const failedResponse = await handler(createRequest(contactInquiry), {
      sellerId: "3",
    });

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.headers.get("Cache-Control")).toBe("no-store");
    expect(limitedResponse.headers.get("Retry-After")).toBe("900");
    await expect(limitedResponse.json()).resolves.toEqual({
      error: "too_many_requests",
      message: "Too many inquiries. Please try again later.",
    });
    expect(failedResponse.status).toBe(500);
    expect(failedResponse.headers.get("Cache-Control")).toBe("no-store");
    await expect(failedResponse.json()).resolves.toEqual({
      error: "internal_server_error",
      message: "The inquiry could not be delivered.",
    });
  });

  it("rejects invalid seller token maps", () => {
    const validToken = "AwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM";
    const otherValidToken = "BAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ";
    const invalidConfigurations: Array<
      [string | undefined, string | undefined]
    > = [
      [undefined, "3"],
      ["not-json", "3"],
      ["[]", "3"],
      [`{"3":"${validToken}","3":"${otherValidToken}"}`, "3"],
      [JSON.stringify({ "bad/key": validToken }), "bad/key"],
      ['{"3":""}', "3"],
      ['{"3":"has whitespace"}', "3"],
      [JSON.stringify({ "3": "too-short" }), "3"],
      [JSON.stringify({ "3": `${validToken.slice(0, -1)}!` }), "3"],
      [JSON.stringify({ "3": `${validToken.slice(0, -1)}\u0000` }), "3"],
      [JSON.stringify({ "3": validToken, "4": validToken }), "3,4"],
      [JSON.stringify({ "4": validToken }), "3"],
    ];

    for (const [tokenMap, sellerIds] of invalidConfigurations) {
      expect(() =>
        getConfiguredStorefrontInquiryToken("3", tokenMap, sellerIds),
      ).toThrow();
    }
  });
});
