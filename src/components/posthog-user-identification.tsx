"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import {
  identifyPosthogUser,
  resetPosthogUser,
} from "@/lib/analytics/posthog";

export function PosthogUserIdentification() {
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !user) {
      resetPosthogUser();
      return;
    }

    const primaryEmail =
      user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;

    identifyPosthogUser({
      id: user.id,
      email: primaryEmail,
    });
  }, [isLoaded, isSignedIn, user]);

  return null;
}
