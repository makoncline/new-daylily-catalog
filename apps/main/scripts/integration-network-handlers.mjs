import { http, HttpResponse } from "msw";

const capturedEmails = [];

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
