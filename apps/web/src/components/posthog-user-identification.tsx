"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import {
  identifyPosthogUser,
  resetPosthogUser,
} from "@/lib/analytics/posthog";

export function PosthogUserIdentification() {
  const { isLoaded, isSignedIn, user } = useUser();
  const userId = user?.id;
  const userEmail = user?.primaryEmailAddress?.emailAddress;

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !userId) {
      resetPosthogUser();
      return;
    }

    identifyPosthogUser({
      id: userId,
      email: userEmail,
    });
  }, [isLoaded, isSignedIn, userEmail, userId]);

  return null;
}
