"use client";

import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useMemo,
  useState,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  getHermeticPersona,
  HERMETIC_PERSONA_COOKIE,
  HERMETIC_PERSONAS,
} from "@/lib/hermetic/personas.js";

type HermeticPersonaKey = keyof typeof HERMETIC_PERSONAS;

interface HermeticAuthValue {
  isLoaded: true;
  userId: string | null;
  personaKey: HermeticPersonaKey | null;
  setPersonaKey: (key: HermeticPersonaKey | null) => void;
}

const HermeticAuthContext = createContext<HermeticAuthValue>({
  isLoaded: true,
  userId: null,
  personaKey: null,
  setPersonaKey: () => undefined,
});

function readPersonaKey() {
  if (typeof document === "undefined") return null;
  const prefix = `${HERMETIC_PERSONA_COOKIE}=`;
  const value = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  return getHermeticPersona(value)?.key ?? null;
}

function setPersonaCookie(key: HermeticPersonaKey | null) {
  document.cookie = key
    ? `${HERMETIC_PERSONA_COOKIE}=${key}; Path=/; SameSite=Lax`
    : `${HERMETIC_PERSONA_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function ClerkProvider({ children }: { children: ReactNode }) {
  const [personaKey, setPersonaKey] = useState(readPersonaKey);
  const persona = personaKey ? HERMETIC_PERSONAS[personaKey] : null;
  const value = useMemo<HermeticAuthValue>(
    () => ({
      isLoaded: true,
      userId: persona?.clerkUserId ?? null,
      personaKey,
      setPersonaKey,
    }),
    [persona, personaKey],
  );

  return (
    <HermeticAuthContext.Provider value={value}>
      {children}
    </HermeticAuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(HermeticAuthContext);
}

export function useUser() {
  const auth = useAuth();
  const persona = auth.personaKey ? HERMETIC_PERSONAS[auth.personaKey] : null;

  return {
    isLoaded: true,
    isSignedIn: Boolean(persona),
    user: persona
      ? {
          id: persona.clerkUserId,
          primaryEmailAddress: { emailAddress: persona.email },
          imageUrl: "",
        }
      : null,
  };
}

function withClick(children: ReactNode, onClick: (event: MouseEvent) => void) {
  if (isValidElement(children)) {
    const element = children as ReactElement<{
      onClick?: (event: MouseEvent) => void;
    }>;
    return cloneElement(element, {
      onClick: (event: MouseEvent) => {
        element.props.onClick?.(event);
        if (!event.defaultPrevented) onClick(event);
      },
    });
  }

  return (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  );
}

export function SignOutButton({ children }: { children: ReactNode }) {
  const { setPersonaKey } = useContext(HermeticAuthContext);
  return withClick(children, () => {
    setPersonaCookie(null);
    setPersonaKey(null);
    window.location.assign("/");
  });
}

export function SignInButton({
  children,
  forceRedirectUrl = "/dashboard",
}: {
  children: ReactNode;
  forceRedirectUrl?: string;
}) {
  return withClick(children, () => {
    window.location.assign(
      `/sign-in?redirect_url=${encodeURIComponent(forceRedirectUrl)}`,
    );
  });
}

export function SignIn({
  forceRedirectUrl = "/dashboard",
}: {
  forceRedirectUrl?: string;
}) {
  const { setPersonaKey } = useContext(HermeticAuthContext);
  const signIn = (key: HermeticPersonaKey) => {
    setPersonaCookie(key);
    setPersonaKey(key);
    const destination = new URL(forceRedirectUrl, window.location.origin);
    if (destination.href === window.location.href) {
      return;
    }
    window.location.assign(destination.href);
  };

  return (
    <section className="bg-card w-full max-w-md space-y-4 rounded-lg border p-6 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold">Choose a local test persona</h1>
        <p className="text-muted-foreground text-sm">
          Hermetic mode stays on this computer and makes no Clerk requests.
        </p>
      </div>
      <div className="grid gap-2">
        {Object.values(HERMETIC_PERSONAS).map((persona) => (
          <button
            className="hover:bg-accent rounded-md border px-4 py-3 text-left"
            data-hermetic-persona={persona.key}
            key={persona.key}
            onClick={() => signIn(persona.key)}
            type="button"
          >
            <span className="block font-medium">{persona.name}</span>
            <span className="text-muted-foreground block text-xs">
              {persona.subscriptionStatus} · {persona.email}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function UserProfile() {
  const { user } = useUser();
  return (
    <div className="p-6">
      <p className="font-medium">Local test persona</p>
      <p className="text-muted-foreground text-sm">
        {user?.primaryEmailAddress.emailAddress}
      </p>
    </div>
  );
}
