import type Stripe from "stripe";

let sequence = 0;

function nextId(prefix: string) {
  sequence += 1;
  return `${prefix}_hermetic_${sequence}`;
}

export function createHermeticStripeClient() {
  const client = {
    prices: {
      async retrieve() {
        return {
          id: "price_hermetic",
          unit_amount: 50_00,
          unit_amount_decimal: "5000",
          currency: "usd",
          recurring: { interval: "year", interval_count: 1 },
        };
      },
    },
    customers: {
      async create() {
        return { id: nextId("cus") };
      },
    },
    checkout: {
      sessions: {
        async create() {
          const id = nextId("cs");
          return {
            id,
            url: `/hermetic/stripe/checkout?session_id=${id}`,
          };
        },
        async retrieve(sessionId: string) {
          return {
            id: sessionId,
            customer: "cus_hermetic_checkout",
            customer_email: "new-unpaid+clerk_test@hermetic.local",
            subscription: "sub_hermetic_checkout",
            metadata: { flow: "anonymous_onboarding" },
            created: Math.floor(Date.now() / 1000),
          };
        },
      },
    },
    subscriptions: {
      async list() {
        return { data: [] };
      },
      async retrieve(subscriptionId: string) {
        return { id: subscriptionId, status: "trialing" };
      },
    },
    billingPortal: {
      sessions: {
        async create() {
          return {
            id: nextId("bps"),
            url: "/dashboard?hermeticPortal=1",
          };
        },
      },
    },
    webhooks: {
      constructEvent() {
        throw new Error("Stripe webhooks are not available in hermetic mode.");
      },
    },
  };

  return client as unknown as Stripe;
}
