import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { env } from "@/env";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

export async function POST(req: Request) {
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

  const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);

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
    case "user.updated":
      return await handleUpsertUser(evt.data);
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

async function handleUpsertUser(data: WebhookEvent["data"]) {
  const validatedData = validateUserData(data);

  if (validatedData instanceof NextResponse) {
    return validatedData;
  }

  try {
    const user = await db.user.upsert({
      where: { clerkUserId: validatedData.clerkUserId },
      create: validatedData,
      update: validatedData,
    });

    console.log("User upserted:", user);
    return NextResponse.json(
      { message: "User upserted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error upserting user:", error);
    return NextResponse.json(
      { error: "Error upserting user" },
      { status: 500 },
    );
  }
}
