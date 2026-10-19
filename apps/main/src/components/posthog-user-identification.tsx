"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { clearUser, setUser } from "@/lib/sentry";
import {
  identifyPosthogUser,
  preloadPosthog,
  resetPosthogUserIfIdentified,
} from "@/lib/analytics/posthog";

export function PosthogUserIdentification() {
  const { isLoaded, isSignedIn, user } = useUser();
  const userId = user?.id;
  const userEmail = user?.primaryEmailAddress?.emailAddress;

  useEffect(() => {
    preloadPosthog();
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !userId) {
      clearUser();
      resetPosthogUserIfIdentified();
      return;
    }

    setUser({ id: userId });
    identifyPosthogUser({
      id: userId,
      email: userEmail,
    });
  }, [isLoaded, isSignedIn, userEmail, userId]);

  return null;
}
