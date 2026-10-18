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

function cookieAccount() {
  return document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("integration-auth="))
    ?.split("=")[1];
}

let loaded = false;
let currentAccount: string | undefined;
function account() {
  if (!loaded) {
    currentAccount = cookieAccount();
    loaded = true;
  }
  return currentAccount;
}
const subscribe = (listener: () => void) => {
  const changed = () => {
    currentAccount = cookieAccount();
    listener();
  };
  window.addEventListener("integration-auth-change", changed);
  return () => window.removeEventListener("integration-auth-change", changed);
};
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
const otherAuth: AuthSnapshot = {
  ...signedInAuth,
  userId: "user_integration_other",
  sessionId: "session_integration_other",
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

const otherUser: UserSnapshot = {
  ...signedInUser,
  user: { ...clerkUser, id: "user_integration_other" },
};

export function ClerkProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  return useSyncExternalStore<AuthSnapshot>(
    subscribe,
    () =>
      account() === "anonymous"
        ? anonymousAuth
        : account() === "other-member"
          ? otherAuth
          : signedInAuth,
    () => unloadedAuth,
  );
}

export function useUser() {
  return useSyncExternalStore<UserSnapshot>(
    subscribe,
    () =>
      account() === "anonymous"
        ? anonymousUser
        : account() === "other-member"
          ? otherUser
          : signedInUser,
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
