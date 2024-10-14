import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { env } from "@/env";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local",
    );
  }

  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: "Error occurred -- no svix headers" },
      { status: 400 },
    );
  }

  const payload = (await req.json()) as unknown;
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return NextResponse.json({ error: "Error occurred" }, { status: 400 });
  }

  switch (evt.type) {
    case "user.created":
      return await handleUserCreated(evt.data);
    case "user.updated":
      return await handleUserUpdated(evt.data);
    default:
      return NextResponse.json(
        { message: "Webhook received" },
        { status: 200 },
      );
  }
}

const ClerkUserWebhookSchema = z.object({
  id: z.string(),
  username: z.string().nullable(),
  email_addresses: z.array(
    z.object({
      id: z.string(),
      email_address: z.string().email(),
    }),
  ),
  primary_email_address_id: z.string(),
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ValidatedUserDataSchema = z.object({
  clerkUserId: z.string(),
  email: z.string().email(),
  username: z.string(),
});

type ValidatedUserData = z.infer<typeof ValidatedUserDataSchema>;

function validateUserData(data: unknown): ValidatedUserData | NextResponse {
  const result = ClerkUserWebhookSchema.safeParse(data);

  if (!result.success) {
    console.error("Validation error:", result.error);
    return NextResponse.json({ error: "Invalid user data" }, { status: 400 });
  }

  const {
    id: clerkUserId,
    username,
    email_addresses,
    primary_email_address_id,
  } = result.data;

  const primaryEmail = email_addresses.find(
    (email) => email.id === primary_email_address_id,
  );

  if (!primaryEmail) {
    console.error("Primary email not found");
    return NextResponse.json(
      { error: "Primary email not found" },
      { status: 400 },
    );
  }

  if (!username) {
    return NextResponse.json({ error: "Username not found" }, { status: 400 });
  }

  return {
    clerkUserId,
    email: primaryEmail.email_address,
    username,
  };
}

async function handleUserCreated(data: WebhookEvent["data"]) {
  const validatedData = validateUserData(data);

  if (validatedData instanceof NextResponse) {
    return validatedData;
  }

  try {
    const newUser = await db.user.create({
      data: validatedData,
    });

    console.log("User created:", newUser);
    return NextResponse.json(
      { message: "User created successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Error creating user" }, { status: 500 });
  }
}

async function handleUserUpdated(data: WebhookEvent["data"]) {
  const validatedData = validateUserData(data);

  if (validatedData instanceof NextResponse) {
    return validatedData;
  }

  try {
    const existingUser = await db.user.findUnique({
      where: { clerkUserId: validatedData.clerkUserId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: Partial<ValidatedUserData> = {};

    if (existingUser.email !== validatedData.email) {
      updateData.email = validatedData.email;
    }
    if (existingUser.username !== validatedData.username) {
      updateData.username = validatedData.username;
    }

    if (Object.keys(updateData).length > 0) {
      const updatedUser = await db.user.update({
        where: { clerkUserId: validatedData.clerkUserId },
        data: updateData,
      });

      console.log("User updated:", updatedUser);
      return NextResponse.json(
        { message: "User updated successfully" },
        { status: 200 },
      );
    } else {
      console.log("No changes detected for user:", validatedData.clerkUserId);
      return NextResponse.json(
        { message: "No updates required" },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Error updating user" }, { status: 500 });
  }
}
