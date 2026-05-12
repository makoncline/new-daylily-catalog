// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/public-router-send-message.sqlite";

const serviceMocks = vi.hoisted(() => ({
  sendPublicInquiry: vi.fn(),
}));

vi.mock("@/server/services/public-inquiry", () => ({
  sendPublicInquiry: serviceMocks.sendPublicInquiry,
}));

type RouterModule = typeof import("@/server/api/routers/public");
let publicRouter: RouterModule["publicRouter"];

beforeAll(async () => {
  ({ publicRouter } = await import("@/server/api/routers/public"));
});

function createCaller(headers: Headers) {
  return publicRouter.createCaller({
    db: {} as TRPCInternalContext["db"],
    headers,
  });
}

describe("public.sendMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.sendPublicInquiry.mockResolvedValue({
      success: true,
      message: "Message sent successfully",
    });
  });

  it("passes request headers to the inquiry service", async () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.10" });
    const caller = createCaller(headers);
    const input = {
      userId: "seller-1",
      customerEmail: "buyer@example.com",
      customerName: "Buyer",
      message: "Do you still have this daylily?",
      items: [
        {
          id: "cart-item-1",
          title: "Starman",
          price: 25,
          quantity: 1,
          listingId: "listing-1",
          userId: "seller-1",
        },
      ],
    };

    await caller.sendMessage(input);

    expect(serviceMocks.sendPublicInquiry).toHaveBeenCalledWith(input, {
      headers,
    });
  });

  it("rejects oversized messages before calling the inquiry service", async () => {
    const caller = createCaller(new Headers());

    await expect(
      caller.sendMessage({
        userId: "seller-1",
        customerEmail: "buyer@example.com",
        message: "x".repeat(5001),
      }),
    ).rejects.toThrow();
    expect(serviceMocks.sendPublicInquiry).not.toHaveBeenCalled();
  });
});
