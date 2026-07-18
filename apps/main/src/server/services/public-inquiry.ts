import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { TRPCError } from "@trpc/server";
import { env, requireEnv } from "@/env";
import type { CartItem } from "@/types";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { db } from "@/server/db";
import { getClerkUserData } from "@/server/clerk/sync-user";
import { isPublished } from "@/server/db/public-visibility/filters";
import { enforcePublicInquiryRateLimit } from "@/server/services/public-inquiry-rate-limit";

export interface SendPublicInquiryInput {
  userId: string;
  customerEmail: string;
  customerName?: string;
  message: string;
  items?: CartItem[];
}

export interface SendPublicInquiryOptions {
  headers?: Headers;
}

interface PublicInquiryContext {
  catalogUrl: string;
  customerDisplayName: string;
  customerName: string | undefined;
  customerEmail: string;
  formattedItems: string;
  hadOmittedItems: boolean;
  hasCartItems: boolean;
  sellerEmail: string;
  sellerNameForSellerEmail: string;
  sellerNameForCustomerEmail: string;
  sellerSubjectName: string;
  subtotal: number;
}

function getSesClient() {
  return new SESClient({
    region: requireEnv("AWS_REGION", env.AWS_REGION),
    endpoint:
      process.env.INTEGRATION_MODE === "1"
        ? process.env.AWS_ENDPOINT_URL_SES
        : undefined,
    credentials: {
      accessKeyId: requireEnv("AWS_ACCESS_KEY_ID", env.AWS_ACCESS_KEY_ID),
      secretAccessKey: requireEnv(
        "AWS_SECRET_ACCESS_KEY",
        env.AWS_SECRET_ACCESS_KEY,
      ),
    },
  });
}

function getCustomerDisplayName(input: SendPublicInquiryInput) {
  return input.customerName && input.customerName.trim() !== ""
    ? input.customerName
    : input.customerEmail;
}

function normalizeInquiryMessage(message: string) {
  if (message.trim() === "") {
    return "";
  }

  const trimmedMessage = message.trim();
  const cartItemsIndex = trimmedMessage.indexOf("--- Cart Items ---");

  if (cartItemsIndex === -1) {
    return trimmedMessage;
  }

  const messageBeforeCart = trimmedMessage.substring(0, cartItemsIndex).trim();
  return messageBeforeCart || "";
}

function formatCartItems(items: CartItem[] | undefined) {
  if (!items || items.length === 0) {
    return {
      hasCartItems: false,
      formattedItems: "(No items selected)",
      subtotal: 0,
    };
  }

  const subtotal = items.reduce(
    (sum, item) => sum + (item.price ?? 0) * item.quantity,
    0,
  );
  const formattedItems = items
    .map(
      (item) =>
        `- ${item.title} – Qty: ${item.quantity}${
          item.price ? ` ($${item.price.toFixed(2)} each)` : ""
        }`,
    )
    .join("\n");

  return {
    hasCartItems: true,
    formattedItems,
    subtotal,
  };
}

async function resolveCartItems(input: SendPublicInquiryInput) {
  if (!input.items?.length) {
    return { items: input.items, hadOmittedItems: false };
  }

  const listings = await db.listing.findMany({
    where: {
      id: { in: [...new Set(input.items.map((item) => item.listingId))] },
      userId: input.userId,
      ...isPublished(),
    },
    select: { id: true, title: true, price: true },
  });
  const listingById = new Map(listings.map((listing) => [listing.id, listing]));
  const items = input.items.flatMap((item) => {
    const listing = listingById.get(item.listingId);
    return listing
      ? [{ ...item, title: listing.title, price: listing.price }]
      : [];
  });

  if (items.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cart items could not be verified.",
    });
  }

  return { items, hadOmittedItems: items.length !== input.items.length };
}

async function loadPublicInquiryContext(
  input: SendPublicInquiryInput,
): Promise<PublicInquiryContext> {
  const user = await db.user.findUnique({
    where: { id: input.userId },
    include: {
      profile: true,
    },
  });

  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }

  const clerkUserId = user.clerkUserId;
  if (!clerkUserId) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "User does not have a Clerk account",
    });
  }

  const clerkUserData = await getClerkUserData(clerkUserId);
  const sellerEmail = clerkUserData?.email;
  if (!sellerEmail) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not find user's email",
    });
  }

  const customerDisplayName = getCustomerDisplayName(input);
  const { items, hadOmittedItems } = await resolveCartItems(input);
  const { formattedItems, hasCartItems, subtotal } = formatCartItems(items);
  const catalogUrl = `${getCanonicalBaseUrl()}/${user.profile?.slug ?? user.id}`;

  return {
    catalogUrl,
    customerDisplayName,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    formattedItems,
    hadOmittedItems,
    hasCartItems,
    sellerEmail,
    sellerNameForSellerEmail: user.profile?.title ?? "Seller",
    sellerNameForCustomerEmail: user.profile?.title ?? "the seller",
    sellerSubjectName: user.profile?.title ?? "Daylily Catalog",
    subtotal,
  };
}

function buildSellerEmailBody(
  context: PublicInquiryContext,
  formattedMessage: string,
) {
  return `Hello ${context.sellerNameForSellerEmail},

You've received a new customer inquiry through Daylily Catalog.

Customer Information:
- ${context.customerName ? `Name: ${context.customerDisplayName}` : "Name: (Not provided)"}
- Email: ${context.customerEmail}

${
  formattedMessage
    ? `Customer's Message:
${formattedMessage}`
    : ""
}

${
  context.hasCartItems
    ? `Customer's Selected Items:
${context.formattedItems}${context.hadOmittedItems ? "\n\nOne or more unavailable items were omitted." : ""}

Subtotal: $${context.subtotal.toFixed(2)}
Note: Final pricing, shipping, and handling are at your discretion.`
    : "No items were selected."
}

---

To reply, contact the customer at: ${context.customerEmail}

This is an automated message from Daylily Catalog. Please do not reply.
View your catalog: ${context.catalogUrl}
`;
}

function buildCustomerEmailBody(
  context: PublicInquiryContext,
  formattedMessage: string,
) {
  return `Hello ${context.customerDisplayName},

Thank you for contacting ${context.sellerNameForCustomerEmail} through Daylily Catalog!

We've forwarded your inquiry, and someone from ${context.sellerNameForCustomerEmail} will respond soon.

Your Information:
- Email: ${context.customerEmail}
${context.customerName ? `- Name: ${context.customerDisplayName}` : "- Name: (Not provided)"}

${
  formattedMessage
    ? `Your Message:
${formattedMessage}`
    : ""
}

${
  context.hasCartItems
    ? `Items you're interested in:
${context.formattedItems}${context.hadOmittedItems ? "\n\nOne or more unavailable items were omitted." : ""}

Subtotal: $${context.subtotal.toFixed(2)}
(Note: Final pricing, shipping, and handling may vary at the discretion of the seller.)`
    : ""
}

---

Continue exploring ${context.sellerNameForCustomerEmail}'s collection here:
${context.catalogUrl}

This is an automated confirmation from Daylily Catalog. Please do not reply.
`;
}

export async function sendPublicInquiry(
  input: SendPublicInquiryInput,
  options: SendPublicInquiryOptions = {},
): Promise<{ success: boolean; message: string }> {
  try {
    await enforcePublicInquiryRateLimit({
      headers: options.headers,
      input,
    });

    const context = await loadPublicInquiryContext(input);
    const cleanedMessage = normalizeInquiryMessage(input.message);
    const formattedMessage =
      cleanedMessage !== ""
        ? cleanedMessage
        : context.hasCartItems
          ? "(No message provided.)"
          : "";

    if (!context.hasCartItems && cleanedMessage === "") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Message is required when no items are in the cart",
      });
    }

    const sellerEmailBody = buildSellerEmailBody(context, formattedMessage);
    const customerEmailBody = buildCustomerEmailBody(context, formattedMessage);

    const ses = getSesClient();

    const sendToUser = new SendEmailCommand({
      Destination: {
        ToAddresses: [context.sellerEmail],
        BccAddresses: [
          "admin@daylilycatalog.com",
          "makon+daylilycatalog-messages@hey.com",
        ],
      },
      Message: {
        Body: {
          Text: {
            Charset: "UTF-8",
            Data: sellerEmailBody,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "New Customer Inquiry | Daylily Catalog",
        },
      },
      Source: "daylily-catalog <noreply@daylilycatalog.com>",
      ReplyToAddresses: [context.customerEmail],
    });

    const sendToCustomer = new SendEmailCommand({
      Destination: {
        ToAddresses: [context.customerEmail],
        BccAddresses: ["makon+daylilycatalog-messages@hey.com"],
      },
      Message: {
        Body: {
          Text: {
            Charset: "UTF-8",
            Data: customerEmailBody,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: `We've received your inquiry! | ${context.sellerSubjectName} 🌸`,
        },
      },
      Source: "daylily-catalog <noreply@daylilycatalog.com>",
    });

    await Promise.all([ses.send(sendToUser), ses.send(sendToCustomer)]);

    return {
      success: true,
      message: "Message sent successfully",
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }

    console.error("Error sending message:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to send message",
    });
  }
}
