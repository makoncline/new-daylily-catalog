import { http, HttpResponse } from "msw";

export const integrationNetworkHandlers = [
  http.get("*/__health", () => HttpResponse.text("ok")),
  http.get("*/v1/prices/:priceId", ({ params }) =>
    HttpResponse.json({
      id: params.priceId,
      object: "price",
      active: true,
      currency: "usd",
      recurring: { interval: "year", interval_count: 1 },
      type: "recurring",
      unit_amount: 4900,
      unit_amount_decimal: "4900",
    }),
  ),
  http.post("*/v1/checkout/sessions", async ({ request }) => {
    const body = await request.formData();

    if (
      body.get("customer_email") ===
      "integration-stripe-failure@example.com"
    ) {
      return HttpResponse.json(
        {
          error: {
            message: "Stripe is unavailable in this integration scenario.",
            type: "api_error",
          },
        },
        { status: 500 },
      );
    }

    return HttpResponse.json({
      id: "cs_test_integration_onboarding",
      object: "checkout.session",
      url: `${process.env.APP_BASE_URL ?? "http://localhost:3210"}/onboarding/checkout/success?session_id=cs_test_integration_onboarding`,
    });
  }),
  http.get(
    "*/v1/checkout/sessions/cs_test_integration_onboarding",
    () =>
      HttpResponse.json({
        id: "cs_test_integration_onboarding",
        object: "checkout.session",
        created: 1_700_000_000,
        customer: {
          id: "cus_integration_onboarding",
          object: "customer",
          email: "integration-stripe-success@example.com",
        },
        metadata: { flow: "anonymous_onboarding" },
        subscription: {
          id: "sub_integration_onboarding",
          object: "subscription",
          status: "trialing",
        },
      }),
  ),
];
