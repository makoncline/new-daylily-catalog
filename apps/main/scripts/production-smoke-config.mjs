import { spawnSync } from "node:child_process";

export const productionOrigin = "https://daylilycatalog.com";

export class SmokePrerequisite extends Error {}

/** @param {string} email */
export function watchSignedInSmokeIdentity(email) {
  const clerk =
    /** @type {ReturnType<typeof import('@clerk/nextjs').useClerk> | undefined} */ (
      Reflect.get(window, "Clerk")
    );
  const publish =
    /** @type {(identity: {id: string, email: string} | null) => Promise<void>} */ (
      Reflect.get(window, "__daylilySmokeIdentity")
    );
  clerk?.addListener(({ client }) => {
    const activeSessions = client.sessions.filter(
      (session) => session.status === "active",
    );
    const user = activeSessions.length === 1 ? activeSessions[0]?.user : null;
    const address = user?.emailAddresses.find(
      (address) => address.emailAddress.toLowerCase() === email.toLowerCase(),
    );
    void publish(
      user && address ? { id: user.id, email: address.emailAddress } : null,
    ).catch(() => undefined);
  });
}

/** @param {Record<string, string | undefined>} env */
export function productionSmokeConfig(env) {
  if (
    env.DEBUG ||
    env.PWDEBUG ||
    env.npm_config_pwdebug ||
    env.npm_package_config_pwdebug ||
    env.NODE_OPTIONS
  ) {
    throw new SmokePrerequisite(
      "Remove DEBUG, PWDEBUG, npm_config_pwdebug, npm_package_config_pwdebug, and NODE_OPTIONS before this run.",
    );
  }
  if (env.BASE_URL && env.BASE_URL !== productionOrigin) {
    throw new SmokePrerequisite(
      "This check uses only the canonical production origin.",
    );
  }
  const email = env.DAYLILY_SMOKE_EMAIL?.trim() ?? "";
  const clerkUserId = env.DAYLILY_SMOKE_CLERK_USER_ID?.trim() ?? "";
  const profileSlug = env.DAYLILY_SMOKE_PROFILE_SLUG?.trim() ?? "";
  const release = env.DAYLILY_SMOKE_RELEASE?.trim() ?? "";
  if (
    !/^[a-zA-Z0-9.+_-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]+$/.test(email ?? "") ||
    !/^user_[a-zA-Z0-9]+$/.test(clerkUserId ?? "") ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(profileSlug ?? "") ||
    !/^[a-f0-9]{40}$/.test(release ?? "")
  ) {
    throw new SmokePrerequisite(
      "Set DAYLILY_SMOKE_EMAIL, DAYLILY_SMOKE_CLERK_USER_ID, DAYLILY_SMOKE_PROFILE_SLUG, and DAYLILY_SMOKE_RELEASE. Confirm this account and profile already exist in the primary database.",
    );
  }
  return { email, clerkUserId, profileSlug, release };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {(command: string, args: string[], options: import('node:child_process').SpawnSyncOptionsWithStringEncoding) => {status: number | null, stdout: string}} [readKeychain]
 */
export function productionSmokePassword(env, readKeychain = spawnSync) {
  if (env.DAYLILY_SMOKE_PASSWORD) return env.DAYLILY_SMOKE_PASSWORD;
  if (env.DAYLILY_SMOKE_USE_KEYCHAIN !== "1" || process.platform !== "darwin") {
    throw new SmokePrerequisite(
      "Set a private DAYLILY_SMOKE_PASSWORD value, or confirm the saved item with DAYLILY_SMOKE_USE_KEYCHAIN=1 on macOS.",
    );
  }
  const result = readKeychain(
    "/usr/bin/security",
    [
      "find-generic-password",
      "-s",
      "daylily-production-smoke",
      "-a",
      env.DAYLILY_SMOKE_EMAIL?.trim() ?? "",
      "-w",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 10_000 },
  );
  if (result.status !== 0 || !result.stdout) {
    throw new SmokePrerequisite(
      "The exact production smoke Keychain item is not available. No login was attempted.",
    );
  }
  return result.stdout.replace(/\r?\n$/, "");
}

const readQueries = new Set([
  "public.getProfile",
  "public.getListings",
  "public.getPublicProfiles",
  "user.getCurrentUser",
  "dashboardDb.user.getCurrentUserId",
  "stripe.getSubscription",
  "dashboardDb.bootstrap.replicaAvailable",
  "dashboardDb.bootstrap.roots",
  "dashboardDb.bootstrap.replicaRoots",
  "dashboardDb.userProfile.get",
  "dashboardDb.list.get",
  "dashboardDb.list.sync",
  "dashboardDb.listing.get",
  "dashboardDb.listing.getByIds",
  "dashboardDb.listing.sync",
  "dashboardDb.image.get",
  "dashboardDb.image.sync",
  "dashboardDb.cultivarReference.getByIds",
  "dashboardDb.cultivarReference.sync",
]);

// These POST handlers use only reads. The dashboard uses them for large batches.
const readPosts = new Set([
  "dashboardDb.image.listByListingIds",
  "dashboardDb.image.listByListingIdsReplica",
  "dashboardDb.cultivarReference.getByIdsBatch",
  "dashboardDb.cultivarReference.getByIdsBatchReplica",
]);

/** @param {string} url @param {string} method @param {boolean} accountVerified @param {boolean} [signInServerAction] */
export function allowedProductionRequest(
  url,
  method,
  accountVerified,
  signInServerAction = false,
) {
  const target = new URL(url);
  if (target.origin !== productionOrigin) return true;
  if (target.pathname === "/cdn-cgi/rum" && method === "POST") return true;
  // Clerk calls invalidateCacheAction before it activates the normal session.
  if (target.pathname === "/sign-in" && method === "POST" && signInServerAction)
    return true;
  if (target.pathname.startsWith("/api/trpc/")) {
    const names = decodeURIComponent(
      target.pathname.slice("/api/trpc/".length),
    ).split(",");
    const allowed =
      method === "GET"
        ? readQueries
        : method === "POST"
          ? readPosts
          : new Set();
    return names.every(
      (name) =>
        allowed.has(name) && (accountVerified || name.startsWith("public.")),
    );
  }
  if (target.pathname.startsWith("/api/")) {
    return method === "GET" && target.pathname === "/api/runtime-config";
  }
  if (target.pathname.startsWith("/dashboard") && !accountVerified)
    return false;
  return method === "GET" || method === "HEAD";
}

/** @param {string} url */
export function blockedRequestLabel(url) {
  const path = decodeURIComponent(new URL(url).pathname);
  if (
    /^\/api\/trpc\/[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+(?:,[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+)*$/.test(
      path,
    ) &&
    path.length <= 240
  )
    return path;
  if (/^\/api\/[a-z-]+$/.test(path) && path.length <= 80) return path;
  if (path.startsWith("/dashboard")) return "/dashboard";
  if (path === "/sign-in" || path === "/") return path;
  const staticSegments = new Set([
    "api",
    "auth",
    "clerk",
    "__clerk",
    "v1",
    "client",
    "environment",
    "sign_ins",
    "attempt_first_factor",
    "_next",
    "cdn-cgi",
    "rum",
    "challenge-platform",
    "h",
    "b",
    "jsd",
    "oneshot",
    "flow",
    "orchestrate",
    "turnstile",
    "pat",
  ]);
  return path
    .split("/")
    .slice(0, 9)
    .map((segment) =>
      !segment || staticSegments.has(segment) ? segment : "[redacted]",
    )
    .join("/");
}

/** @param {string} visibleText */
export function authFailureCategory(visibleText) {
  if (/captcha|security check|verify you are human/i.test(visibleText))
    return "security-challenge";
  if (
    /verification code|two.step|two.factor|authenticator|verify your identity/i.test(
      visibleText,
    )
  )
    return "additional-verification";
  if (/incorrect|invalid|wrong|couldn't find.*account/i.test(visibleText))
    return "credential-or-input-error";
  if (/access denied|blocked|too many|locked/i.test(visibleText))
    return "access-denial";
  return "unresolved-auth-timeout";
}
