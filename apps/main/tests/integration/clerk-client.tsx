"use client";

import type { ReactNode } from "react";

const clerkUser = {
  id: "user_integration_seller",
  primaryEmailAddress: {
    emailAddress: "integration-seller@example.test",
  },
};

export function ClerkProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: clerkUser.id,
    sessionId: "session_integration_seller",
    getToken: async () => null,
  };
}

export function useUser() {
  return { isLoaded: true, isSignedIn: true, user: clerkUser };
}

export function SignOutButton({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function SignInButton({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function SignIn() {
  return null;
}

export function UserProfile() {
  return null;
}
