import { http, HttpResponse } from "msw";

const capturedEmails = [];
const checkoutReturnPaths = new Map([
  ["cs_test_integration_catalog_importer", "/catalog-importer"],
  ["cs_test_integration_onboarding", "/playground"],
]);
const checkoutCustomer = {
  id: "cus_integration_catalog_importer",
  object: "customer",
  email: "integration-stripe-success@example.com",
};
const checkoutSubscription = {
  id: "sub_integration_catalog_importer",
  object: "subscription",
  status: "active",
  cancel_at_period_end: false,
  items: {
    data: [
      {
        price: { id: "price_integration_annual" },
        current_period_start: 1_700_000_000,
        current_period_end: 1_731_536_000,
      },
    ],
  },
};

function queryValues(params, prefix) {
  return [...params.entries()]
    .filter(([name]) => name.startsWith(prefix))
    .sort(([left], [right]) =>
      left.localeCompare(right, undefined, { numeric: true }),
    )
    .map(([, value]) => value);
}

function captureSesEmail(params) {
  const email = {
    id: `integration-email-${capturedEmails.length + 1}`,
    from: params.get("Source") ?? "",
    to: queryValues(params, "Destination.ToAddresses.member."),
    bcc: queryValues(params, "Destination.BccAddresses.member."),
    replyTo: queryValues(params, "ReplyToAddresses.member."),
    subject: params.get("Message.Subject.Data") ?? "",
    text: params.get("Message.Body.Text.Data") ?? "",
  };
  capturedEmails.push(email);
  console.log(
    [
      "",
      `[integration email] ${email.subject}`,
      `From: ${email.from}`,
      `To: ${email.to.join(", ")}`,
      email.bcc.length > 0 ? `Bcc: ${email.bcc.join(", ")}` : "",
      email.replyTo.length > 0 ? `Reply-To: ${email.replyTo.join(", ")}` : "",
      "",
      email.text,
    ]
      .filter((line) => line !== "")
      .join("\n"),
  );
  return email;
}

export const integrationNetworkHandlers = [
  http.get("*/__health", () => HttpResponse.text("ok")),
  http.get("*/__emails", () => HttpResponse.json(capturedEmails)),
  http.delete("*/__emails", () => {
    capturedEmails.length = 0;
    return new HttpResponse(null, { status: 204 });
  }),
  http.post("*/ses", async ({ request }) => {
    const params = new URLSearchParams(await request.text());
    if (params.get("Action") !== "SendEmail") {
      return HttpResponse.json(
        { error: `Unsupported SES action: ${params.get("Action")}` },
        { status: 400 },
      );
    }

    const email = captureSesEmail(params);
    return HttpResponse.xml(`
      <SendEmailResponse xmlns="http://ses.amazonaws.com/doc/2010-12-01/">
        <SendEmailResult><MessageId>${email.id}</MessageId></SendEmailResult>
        <ResponseMetadata><RequestId>${email.id}</RequestId></ResponseMetadata>
      </SendEmailResponse>
    `);
  }),
  http.get("*/v1/subscriptions", ({ request }) => {
    const customerId = new URL(request.url).searchParams.get("customer");
    if (customerId !== checkoutCustomer.id) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({
      object: "list",
      data: [checkoutSubscription],
      has_more: false,
    });
  }),
  http.get("*/v1/checkout/sessions/:sessionId", ({ params }) => {
    const returnTo = checkoutReturnPaths.get(params.sessionId);
    if (!returnTo) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({
      id: params.sessionId,
      object: "checkout.session",
      payment_status: "paid",
      customer: checkoutCustomer,
      metadata: {
        ...(returnTo === "/playground" && {
          billing_choice: "stripe_checkout_upsell",
          membership_currency: "usd",
          membership_product_id: "prod_integration_membership",
        }),
        entry_source: "catalog_importer",
        import_id: "integration-catalog-import",
        return_to: returnTo,
        source: "catalog_importer",
      },
      subscription: checkoutSubscription,
    });
  }),
  http.get("*/v1/checkout/sessions/:sessionId/line_items", ({ params }) => {
    if (!checkoutReturnPaths.has(params.sessionId)) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({
      object: "list",
      data: [
        {
          id: "li_integration_membership",
          object: "item",
          price: {
            id: "price_integration_annual",
            object: "price",
            active: true,
            currency: "usd",
            product: "prod_integration_membership",
            recurring: { interval: "year", interval_count: 1 },
            type: "recurring",
            unit_amount: 7999,
            unit_amount_decimal: "7999",
          },
          quantity: 1,
        },
      ],
      has_more: false,
    });
  }),
];
