// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "@/types";

const mocks = vi.hoisted(() => ({
  findListings: vi.fn(),
  findUser: vi.fn(),
  getClerkUserData: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@aws-sdk/client-ses", () => ({
  SESClient: class {
    send = mocks.sendEmail;
  },
  SendEmailCommand: class {
    constructor(public input: unknown) {}
  },
}));
vi.mock("@/env", () => ({ env: {}, requireEnv: () => "test" }));
vi.mock("@/server/db", () => ({
  db: {
    listing: { findMany: mocks.findListings },
    user: { findUnique: mocks.findUser },
  },
}));
vi.mock("@/server/clerk/sync-user", () => ({
  getClerkUserData: mocks.getClerkUserData,
}));
vi.mock("@/server/services/public-inquiry-rate-limit", () => ({
  enforcePublicInquiryRateLimit: vi.fn(),
}));
vi.mock("@/lib/utils/getBaseUrl", () => ({
  getCanonicalBaseUrl: () => "https://daylilycatalog.com",
}));

type InquiryModule = typeof import("@/server/services/public-inquiry");
let sendPublicInquiry: InquiryModule["sendPublicInquiry"];

beforeAll(async () => {
  ({ sendPublicInquiry } = await import("@/server/services/public-inquiry"));
});

const baseItem: CartItem = {
  id: "cart-1",
  title: "Client title",
  price: 0.01,
  quantity: 2,
  listingId: "listing-1",
  userId: "seller-1",
};

function emailBody(call: number) {
  return (
    mocks.sendEmail.mock.calls[call]?.[0] as {
      input: { Message: { Body: { Text: { Data: string } } } };
    }
  ).input.Message.Body.Text.Data;
}

describe("public inquiry cart validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUser.mockResolvedValue({
      id: "seller-1",
      clerkUserId: "clerk-1",
      profile: { slug: "seller", title: "Seller" },
    });
    mocks.getClerkUserData.mockResolvedValue({ email: "seller@example.com" });
    mocks.sendEmail.mockResolvedValue({});
  });

  it("accepts a storefront cart when its listing price is current", async () => {
    mocks.findListings.mockResolvedValue([
      { id: "listing-1", title: "Database title", price: 25 },
    ]);

    await sendPublicInquiry(
      {
        userId: "seller-1",
        customerEmail: "buyer@example.com",
        message: "",
        items: [{ ...baseItem, price: 25 }],
      },
      { rejectCartChanges: true },
    );

    expect(mocks.findListings).toHaveBeenCalledWith({
      where: {
        id: { in: ["listing-1"] },
        userId: "seller-1",
        OR: [{ status: null }, { NOT: { status: "HIDDEN" } }],
      },
      select: { id: true, title: true, price: true },
    });
    expect(emailBody(0)).toContain("Database title – Qty: 2 ($25.00 each)");
    expect(emailBody(0)).toContain("Subtotal: $50.00");
    expect(emailBody(0)).not.toContain("Client title");
  });

  it("rejects a storefront cart when a listing price changed", async () => {
    mocks.findListings.mockResolvedValue([
      { id: "listing-1", title: "Database title", price: 25 },
    ]);

    await expect(
      sendPublicInquiry(
        {
          userId: "seller-1",
          customerEmail: "buyer@example.com",
          message: "",
          items: [baseItem],
        },
        { rejectCartChanges: true },
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("rejects a storefront cart when a listing is hidden or missing", async () => {
    mocks.findListings.mockResolvedValue([
      { id: "listing-1", title: "Database title", price: 25 },
    ]);

    await expect(
      sendPublicInquiry(
        {
          userId: "seller-1",
          customerEmail: "buyer@example.com",
          message: "",
          items: [
            { ...baseItem, price: 25 },
            {
              ...baseItem,
              id: "cart-2",
              listingId: "unavailable-listing",
              price: 30,
            },
          ],
        },
        { rejectCartChanges: true },
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it.each([null, 0, -1])(
    "rejects a storefront cart when a listing price is %s",
    async (price) => {
      mocks.findListings.mockResolvedValue([
        { id: "listing-1", title: "Database title", price },
      ]);

      await expect(
        sendPublicInquiry(
          {
            userId: "seller-1",
            customerEmail: "buyer@example.com",
            message: "",
            items: [baseItem],
          },
          { rejectCartChanges: true },
        ),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      expect(mocks.sendEmail).not.toHaveBeenCalled();
    },
  );

  it("omits invalid items and discloses the omission in both emails", async () => {
    mocks.findListings.mockResolvedValue([
      { id: "listing-1", title: "Database title", price: null },
    ]);

    await sendPublicInquiry({
      userId: "seller-1",
      customerEmail: "buyer@example.com",
      message: "Interested",
      items: [
        baseItem,
        { ...baseItem, id: "cart-2", listingId: "invalid-listing" },
      ],
    });

    expect(emailBody(0)).toContain("Database title – Qty: 2");
    expect(emailBody(0)).toContain(
      "One or more unavailable items were omitted.",
    );
    expect(emailBody(1)).toContain(
      "One or more unavailable items were omitted.",
    );
  });

  it("rejects a cart when none of its listings can be verified", async () => {
    mocks.findListings.mockResolvedValue([]);

    await expect(
      sendPublicInquiry({
        userId: "seller-1",
        customerEmail: "buyer@example.com",
        message: "Interested",
        items: [baseItem],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("leaves message-only inquiries unchanged", async () => {
    await sendPublicInquiry({
      userId: "seller-1",
      customerEmail: "buyer@example.com",
      message: "Do you ship?",
    });

    expect(mocks.findListings).not.toHaveBeenCalled();
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
  });
});
