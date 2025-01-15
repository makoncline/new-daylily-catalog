import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { env } from "@/env";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { syncClerkUserToKV } from "@/server/clerk/sync-user";

// Only include events that are actually supported by Clerk
const relevantEvents = new Set([
  "user.created",
  "user.updated",
  "user.deleted",
  "email.created",
  "email.updated",
  "email.deleted",
  "profile.updated",
  "username.updated",
]);

function getUserIdFromEvent(evt: WebhookEvent): string | null {
  const { id } = evt.data;
  if (!id) {
    console.error("No user id found in event", evt.type);
    return null;
  }
  return id;
}

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

  if (relevantEvents.has(evt.type)) {
    try {
      const clerkUserId = getUserIdFromEvent(evt);
      if (!clerkUserId) {
        return NextResponse.json(
          { error: "No clerk user id found" },
          { status: 400 },
        );
      }

      // First ensure the user exists in our database
      await db.user.upsert({
        where: { clerkUserId },
        create: { clerkUserId },
        update: {},
      });

      // Then sync their data to KV store
      await syncClerkUserToKV(clerkUserId);

      return NextResponse.json(
        { message: "User processed successfully" },
        { status: 200 },
      );
    } catch (error) {
      console.error("Error processing user:", error);
      return NextResponse.json(
        { error: "Error processing user" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ message: "Webhook received" }, { status: 200 });
}
