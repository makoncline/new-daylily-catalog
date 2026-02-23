import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import {
  getListingIdFromSlugOrId,
  getUserIdFromSlugOrId,
} from "@/server/db/getPublicProfile";
import {
  listingSelect,
  transformListings,
} from "@/server/db/getPublicListings";
import {
  getCachedCultivarRouteSegments,
  getCachedPublicCultivarPage,
  getCachedPublicListings,
  getCachedPublicProfile,
  getCachedPublicProfiles,
} from "@/server/db/public-cache";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { env } from "@/env";
import { cartItemSchema } from "@/types";
import { STATUS } from "@/config/constants";
import { getDisplayAhsListing } from "@/lib/utils/ahs-display";
import { createServerCache } from "@/lib/cache/server-cache";
import { CACHE_CONFIG } from "@/config/cache-config";

// Initialize SES client
const ses = new SESClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

// Helper function to get the full listing data with all relations
async function getFullListingData(listingId: string) {
  const publicListingVisibilityFilter = {
    OR: [{ status: null }, { NOT: { status: STATUS.HIDDEN } }],
  };

  const listing = await db.listing.findFirst({
    where: { id: listingId, ...publicListingVisibilityFilter },
    select: listingSelect,
  });

  if (!listing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Listing not found",
    });
  }

  const displayAhsListing = getDisplayAhsListing(listing);

  // Transform the listing to include AHS image if available
  return {
    ...listing,
    ahsListing: displayAhsListing,
    userSlug: listing.user.profile?.slug ?? listing.userId,
    images:
      listing.images.length === 0 && displayAhsListing?.ahsImageUrl
        ? [
            {
              id: `ahs-${listing.id}`,
              url: displayAhsListing.ahsImageUrl,
            },
          ]
        : listing.images,
  };
}

const getCachedFullListingData = createServerCache(getFullListingData, {
  key: "public:listing-detail",
  revalidateSeconds: CACHE_CONFIG.PUBLIC.SEARCH.SERVER_REVALIDATE_SECONDS,
  tags: [CACHE_CONFIG.TAGS.PUBLIC_LISTING_DETAIL],
});

export const publicRouter = createTRPCRouter({
  getPublicProfiles: publicProcedure.query(async () => {
    try {
      return await getCachedPublicProfiles();
    } catch (error) {
      console.error("TRPC Error fetching public profiles:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch public profiles",
      });
    }
  }),

  getProfile: publicProcedure
    .input(z.object({ userSlugOrId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await getCachedPublicProfile(input.userSlugOrId);
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching public profile:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch public profile",
        });
      }
    }),

  getListings: publicProcedure
    .input(
      z.object({
        userSlugOrId: z.string(),
        limit: z.number().min(1).default(36),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const userId = await getUserIdFromSlugOrId(input.userSlugOrId);
        const items = await getCachedPublicListings({
          userId,
          limit: input.limit,
          cursor: input.cursor,
        });

        return transformListings(items);
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch public listings",
          cause: error,
        });
      }
    }),

  getListingById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        return await getCachedFullListingData(input.id);
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching listing:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch listing",
        });
      }
    }),

  getListing: publicProcedure
    .input(
      z.object({
        userSlugOrId: z.string(),
        listingSlugOrId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const userId = await getUserIdFromSlugOrId(input.userSlugOrId);
        const listingId = await getListingIdFromSlugOrId(
          input.listingSlugOrId,
          userId,
        );

        return await getCachedFullListingData(listingId);
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching listing:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch listing",
        });
      }
    }),

  getCultivarPage: publicProcedure
    .input(
      z.object({
        cultivarNormalizedName: z.string(),
      }),
    )
    .query(async ({ input }) => {
      try {
        return await getCachedPublicCultivarPage(input.cultivarNormalizedName);
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching cultivar page:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch cultivar page",
        });
      }
    }),

  getCultivarRouteSegments: publicProcedure.query(async () => {
    try {
      return await getCachedCultivarRouteSegments();
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error("Error fetching cultivar route segments:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch cultivar route segments",
      });
    }
  }),

  // Message sending functionality
  sendMessage: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        customerEmail: z.string().email(),
        customerName: z.string().optional(),
        message: z.string(),
        items: z.array(cartItemSchema).optional(),
      }),
    )
    .mutation(
      async ({ input }): Promise<{ success: boolean; message: string }> => {
        try {
          // Fetch the user's data
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

          // Get the user's email from Clerk
          const clerkUserId = user.clerkUserId;
          if (!clerkUserId) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "User does not have a Clerk account",
            });
          }

          // Fetch clerk user data which contains the email
          const clerkUserData = await (
            await import("@/server/clerk/sync-user")
          ).getClerkUserData(clerkUserId);
          const userEmail = clerkUserData?.email;

          if (!userEmail) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Could not find user's email",
            });
          }

          // Set up the subject and body for the emails
          const customerDisplayName =
            input.customerName && input.customerName.trim() !== ""
              ? input.customerName
              : input.customerEmail;

          // Check if there are cart items in the message
          const hasCartItems = input.items && input.items.length > 0;

          // Extract clean message without cart items
          let cleanedMessage = "";

          if (input.message && input.message.trim() !== "") {
            const trimmedMessage = input.message.trim();
            const cartItemsIndex = trimmedMessage.indexOf("--- Cart Items ---");

            if (cartItemsIndex !== -1) {
              const messageBeforeCart = trimmedMessage
                .substring(0, cartItemsIndex)
                .trim();
              cleanedMessage = messageBeforeCart || "";
            } else {
              cleanedMessage = trimmedMessage;
            }
          }

          // If no cart items, the message should be required
          // If there are cart items, message is optional
          if (!hasCartItems && cleanedMessage === "") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Message is required when no items are in the cart",
            });
          }

          // Format cleaned message for display (handle empty case based on cart items)
          const formattedMessage =
            cleanedMessage !== ""
              ? cleanedMessage
              : hasCartItems
                ? "(No message provided.)"
                : ""; // This shouldn't happen due to the check above

          // Calculate subtotal for cart items if they exist
          let subtotal = 0;
          let formattedItems = "(No items selected)";

          if (hasCartItems && input.items) {
            // Calculate subtotal without dividing by 100
            subtotal = input.items.reduce(
              (sum, item) => sum + (item.price ?? 0) * item.quantity,
              0,
            );

            // Format the items list without dividing prices by 100
            formattedItems = input.items
              .map(
                (item) =>
                  `- ${item.title} – Qty: ${item.quantity}${
                    item.price ? ` ($${item.price.toFixed(2)} each)` : ""
                  }`,
              )
              .join("\n");
          }

          // Update the user email body with the correct subtotal formatting
          const userEmailBody = `Hello ${user.profile?.title ?? "Seller"},

You've received a new customer inquiry through Daylily Catalog.

Customer Information:
- ${input.customerName ? `Name: ${input.customerName}` : "Name: (Not provided)"}
- Email: ${input.customerEmail}

${
  cleanedMessage
    ? `Customer's Message:
${formattedMessage}`
    : ""
}

${
  hasCartItems
    ? `Customer's Selected Items:
${formattedItems}

Subtotal: $${subtotal.toFixed(2)}
Note: Final pricing, shipping, and handling are at your discretion.`
    : "No items were selected."
}

---

To reply, contact the customer at: ${input.customerEmail}

This is an automated message from Daylily Catalog. Please do not reply.
View your catalog: https://daylilycatalog.com/${user.profile?.slug ?? user.id}
`;

          // Update the customer email body with the correct subtotal formatting
          const customerEmailBody = `Hello ${customerDisplayName},

Thank you for contacting ${user.profile?.title ?? "the seller"} through Daylily Catalog!

We've forwarded your inquiry, and someone from ${user.profile?.title ?? "the seller"} will respond soon.

Your Information:
- Email: ${input.customerEmail}
${input.customerName ? `- Name: ${input.customerName}` : "- Name: (Not provided)"}

${
  cleanedMessage
    ? `Your Message:
${formattedMessage}`
    : ""
}

${
  hasCartItems
    ? `Items you're interested in:
${formattedItems}

Subtotal: $${subtotal.toFixed(2)}
(Note: Final pricing, shipping, and handling may vary at the discretion of the seller.)`
    : ""
}

---

Continue exploring ${user.profile?.title ?? "the seller"}'s collection here:
https://daylilycatalog.com/${user.profile?.slug ?? user.id}

This is an automated confirmation from Daylily Catalog. Please do not reply.
`;

          // Send email to the user
          const sendToUser = new SendEmailCommand({
            Destination: {
              ToAddresses: [userEmail],
              BccAddresses: [
                "admin@daylilycatalog.com",
                "makon+daylilycatalog-messages@hey.com",
              ], // BCC to site owner and personal email
            },
            Message: {
              Body: {
                Text: {
                  Charset: "UTF-8",
                  Data: userEmailBody,
                },
              },
              Subject: {
                Charset: "UTF-8",
                Data: `New Customer Inquiry | Daylily Catalog`,
              },
            },
            Source: "daylily-catalog <noreply@daylilycatalog.com>",
            ReplyToAddresses: [input.customerEmail],
          });

          // Send confirmation email to the customer
          const sendToCustomer = new SendEmailCommand({
            Destination: {
              ToAddresses: [input.customerEmail],
              BccAddresses: ["makon+daylilycatalog-messages@hey.com"], // BCC to personal email
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
                Data: `We've received your inquiry! | ${user.profile?.title ?? "Daylily Catalog"} 🌸`,
              },
            },
            Source: "daylily-catalog <noreply@daylilycatalog.com>",
          });

          // Send both emails
          await Promise.all([ses.send(sendToUser), ses.send(sendToCustomer)]);

          return {
            success: true,
            message: "Message sent successfully",
          };
        } catch (error) {
          console.error("Error sending message:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to send message",
          });
        }
      },
    ),
});
