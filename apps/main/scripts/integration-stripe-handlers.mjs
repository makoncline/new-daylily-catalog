import { HttpResponse, http } from "msw";
import { DatabaseSync } from "node:sqlite";

let sequence = 0;

function stripeStateDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.startsWith("file:")) {
    throw new Error("Integration Stripe state requires a local SQLite database.");
  }
  const database = new DatabaseSync(databaseUrl.slice("file:".length));
  database.exec(`
    CREATE TABLE IF NOT EXISTS _HermeticStripeCheckout (
      sessionId TEXT PRIMARY KEY,
      customerId TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0
    )
  `);
  return database;
}

export function resetIntegrationStripeState() {
  sequence = 0;
  const database = stripeStateDatabase();
  try {
    database.exec("DELETE FROM _HermeticStripeCheckout");
  } finally {
    database.close();
  }
}

/** @param {string} customerId */
export function hasCompletedCheckout(customerId) {
  const database = stripeStateDatabase();
  try {
    return Boolean(
      database
        .prepare(
          "SELECT 1 FROM _HermeticStripeCheckout WHERE customerId = ? AND completed = 1 LIMIT 1",
        )
        .get(customerId),
    );
  } finally {
    database.close();
  }
}

/** @param {string} sessionId @param {string} customerId */
function rememberCheckout(sessionId, customerId) {
  const database = stripeStateDatabase();
  try {
    database
      .prepare(
        "INSERT INTO _HermeticStripeCheckout (sessionId, customerId) VALUES (?, ?)",
      )
      .run(sessionId, customerId);
  } finally {
    database.close();
  }
}

/** @param {string} sessionId */
export function completeIntegrationStripeCheckout(sessionId) {
  const database = stripeStateDatabase();
  try {
    return (
      database
        .prepare(
          "UPDATE _HermeticStripeCheckout SET completed = 1 WHERE sessionId = ? AND completed = 0",
        )
        .run(sessionId).changes === 1
    );
  } finally {
    database.close();
  }
}

/** @type {typeof globalThis & { __daylilyResetIntegrationStripeState?: () => void }} */
const integrationGlobal = globalThis;
integrationGlobal.__daylilyResetIntegrationStripeState =
  resetIntegrationStripeState;

/** @param {string} prefix */
function nextId(prefix) {
  sequence += 1;
  return `${prefix}_hermetic_${sequence}`;
}

/** @param {string} pathname */
function localUrl(pathname) {
  return new URL(pathname, process.env.APP_BASE_URL).toString();
}

/** @param {string} message */
function stripeError(message) {
  return HttpResponse.json(
    { error: { message, type: "invalid_request_error" } },
    { status: 400 },
  );
}

/** @param {Request} request */
async function requestParams(request) {
  return new URLSearchParams(await request.text());
}

export const integrationStripeHandlers = [
  http.get("https://api.stripe.com/v1/prices/:priceId", ({ params }) => {
    if (params.priceId !== process.env.STRIPE_PRICE_ID) {
      return stripeError("Unknown membership price.");
    }
    return HttpResponse.json({
      id: params.priceId,
      object: "price",
      active: true,
      currency: "usd",
      recurring: { interval: "year", interval_count: 1 },
      type: "recurring",
      unit_amount: 5000,
      unit_amount_decimal: "5000",
    });
  }),
  http.post("https://api.stripe.com/v1/customers", async ({ request }) => {
    const body = await requestParams(request);
    if (
      !body.get("email") ||
      !body.get("metadata[userId]") ||
      !request.headers.get("idempotency-key")
    ) {
      return stripeError("Customer identity is incomplete.");
    }
    return HttpResponse.json({
      id: nextId("cus"),
      object: "customer",
    });
  }),
  http.get("https://api.stripe.com/v1/subscriptions", ({ request }) => {
    const customerId = new URL(request.url).searchParams.get("customer");
    if (!customerId) {
      return stripeError("Subscription lookup requires a customer.");
    }
    if (hasCompletedCheckout(customerId)) {
      const now = Math.floor(Date.now() / 1_000);
      return HttpResponse.json({
        object: "list",
        data: [
          {
            id: `sub_hermetic_${customerId}`,
            object: "subscription",
            customer: customerId,
            status: "trialing",
            cancel_at_period_end: false,
            current_period_start: now,
            current_period_end: now + 7 * 24 * 60 * 60,
            default_payment_method: null,
            items: {
              object: "list",
              data: [
                {
                  id: `si_hermetic_${customerId}`,
                  current_period_start: now,
                  current_period_end: now + 7 * 24 * 60 * 60,
                  price: { id: process.env.STRIPE_PRICE_ID },
                },
              ],
              has_more: false,
              url: "/v1/subscription_items",
            },
          },
        ],
        has_more: false,
        url: "/v1/subscriptions",
      });
    }
    return HttpResponse.json({
      object: "list",
      data: [],
      has_more: false,
      url: "/v1/subscriptions",
    });
  }),
  http.post(
    "https://api.stripe.com/v1/checkout/sessions",
    async ({ request }) => {
      const body = await requestParams(request);
      const customerId = body.get("customer");
      if (
        body.get("mode") !== "subscription" ||
        body.get("line_items[0][price]") !== process.env.STRIPE_PRICE_ID ||
        body.get("line_items[0][quantity]") !== "1" ||
        !customerId ||
        !body.get("success_url") ||
        !body.get("cancel_url") ||
        !body.get("subscription_data[trial_period_days]")
      ) {
        return stripeError("Subscription checkout request is incomplete.");
      }
      const id = nextId("cs");
      rememberCheckout(id, customerId);
      return HttpResponse.json({
        id,
        object: "checkout.session",
        mode: "subscription",
        status: "open",
        url: localUrl(`/hermetic/stripe/checkout?session_id=${id}`),
      });
    },
  ),
  http.post(
    "https://api.stripe.com/v1/test_helpers/checkout/sessions/:sessionId/complete",
    ({ params }) => {
      if (
        typeof params.sessionId !== "string" ||
        !completeIntegrationStripeCheckout(params.sessionId)
      ) {
        return stripeError("Unknown or already completed checkout session.");
      }
      return HttpResponse.json({
        id: params.sessionId,
        object: "checkout.session",
        status: "complete",
      });
    },
  ),
  http.post(
    "https://api.stripe.com/v1/billing_portal/sessions",
    async ({ request }) => {
      const body = await requestParams(request);
      if (!body.get("customer") || !body.get("return_url")) {
        return stripeError("Billing portal request is incomplete.");
      }
      return HttpResponse.json({
        id: nextId("bps"),
        object: "billing_portal.session",
        url: localUrl("/dashboard?hermeticPortal=1"),
      });
    },
  ),
];
