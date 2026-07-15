"use client";

import { type ReactNode, useSyncExternalStore } from "react";

const clerkUser = {
  id: "user_integration_seller",
  primaryEmailAddress: {
    emailAddress: "integration-seller@example.test",
  },
};

interface AuthSnapshot {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  userId: string | null | undefined;
  sessionId: string | null | undefined;
  getToken: () => Promise<null>;
}

interface UserSnapshot {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  user: typeof clerkUser | null | undefined;
}

function isAnonymous() {
  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim() === "integration-auth=anonymous");
}

const subscribe = () => () => undefined;
const unloadedAuth: AuthSnapshot = {
  isLoaded: false,
  isSignedIn: undefined,
  userId: undefined,
  sessionId: undefined,
  getToken: async () => null,
};
const anonymousAuth: AuthSnapshot = {
  isLoaded: true,
  isSignedIn: false,
  userId: null,
  sessionId: null,
  getToken: async () => null,
};
const signedInAuth: AuthSnapshot = {
  isLoaded: true,
  isSignedIn: true,
  userId: clerkUser.id,
  sessionId: "session_integration_seller",
  getToken: async () => null,
};
const unloadedUser: UserSnapshot = {
  isLoaded: false,
  isSignedIn: undefined,
  user: undefined,
};
const anonymousUser: UserSnapshot = {
  isLoaded: true,
  isSignedIn: false,
  user: null,
};
const signedInUser: UserSnapshot = {
  isLoaded: true,
  isSignedIn: true,
  user: clerkUser,
};

export function ClerkProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  return useSyncExternalStore<AuthSnapshot>(
    subscribe,
    () => (isAnonymous() ? anonymousAuth : signedInAuth),
    () => unloadedAuth,
  );
}

export function useUser() {
  return useSyncExternalStore<UserSnapshot>(
    subscribe,
    () => (isAnonymous() ? anonymousUser : signedInUser),
    () => unloadedUser,
  );
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
