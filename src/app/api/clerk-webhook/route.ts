import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { env } from "@/env";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: Request) {
  // Get the webhook secret from your environment variables
  const WEBHOOK_SECRET = env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local",
    );
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: "Error occurred -- no svix headers" },
      { status: 400 },
    );
  }

  // Get the body
  const payload = (await req.json()) as unknown;
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
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

function validateUserData(data: unknown) {
  const {
    id: clerkUserId,
    username,
    email_addresses,
    primary_email_address_id,
    first_name,
  } = data as {
    id: string;
    username: string | null;
    email_addresses: Array<{ id: string; email_address: string }>;
    primary_email_address_id: string;
    first_name: string | null;
  };

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
  if (!first_name) {
    return NextResponse.json(
      { error: "First name not found" },
      { status: 400 },
    );
  }

  return {
    clerkUserId,
    email: primaryEmail.email_address,
    username,
    name: first_name,
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

interface ValidatedUserData {
  clerkUserId: string;
  email: string;
  username: string;
  name: string;
}

async function handleUserUpdated(data: WebhookEvent["data"]) {
  const validatedData = validateUserData(data);

  if (validatedData instanceof NextResponse) {
    return validatedData;
  }

  try {
    // Fetch the existing user data
    const existingUser = await db.user.findUnique({
      where: { clerkUserId: validatedData.clerkUserId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prepare the update data
    const updateData: Partial<ValidatedUserData> = {};

    if (existingUser.email !== validatedData.email) {
      updateData.email = validatedData.email;
    }
    if (existingUser.username !== validatedData.username) {
      updateData.username = validatedData.username;
    }
    if (existingUser.name !== validatedData.name) {
      updateData.name = validatedData.name;
    }

    // Only update if there are changes
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
