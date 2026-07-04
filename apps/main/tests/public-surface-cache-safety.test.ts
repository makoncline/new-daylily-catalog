import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"] as const;
const SOURCE_ROOT = join(process.cwd(), "src");
const ROOT_CACHE_VARIANT_MARKERS = [
  "@clerk/nextjs",
  "AuthProviders",
  "ClerkProvider",
  "DashboardProviders",
  "PosthogUserIdentification",
  "TRPCReactProvider",
] as const;

function readSource(sourcePath: string) {
  return readFileSync(join(process.cwd(), sourcePath), "utf8");
}

function collectSourceFiles(sourcePath: string): string[] {
  const absolutePath = join(process.cwd(), sourcePath);

  function collect(absoluteSourcePath: string): string[] {
    const stats = statSync(absoluteSourcePath);

    if (stats.isFile()) {
      return [absoluteSourcePath];
    }

    return readdirSync(absoluteSourcePath).flatMap((entry) => {
      const entryPath = join(absoluteSourcePath, entry);
      const entryStats = statSync(entryPath);

      if (entryStats.isDirectory()) {
        return collect(entryPath);
      }

      if (SOURCE_EXTENSIONS.some((extension) => entryPath.endsWith(extension))) {
        return [entryPath];
      }

      return [];
    });
  }

  return collect(absolutePath);
}

function isTypeOnlyImport(importClause: string) {
  const trimmed = importClause.trim();

  if (trimmed.startsWith("type ")) {
    return true;
  }

  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return false;
  }

  const namedImports = trimmed
    .slice(1, -1)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    namedImports.length > 0 &&
    namedImports.every((item) => item.startsWith("type "))
  );
}

function resolveSourceImport(fromFile: string, specifier: string) {
  const basePath = specifier.startsWith("@/")
    ? join(SOURCE_ROOT, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(fromFile), specifier)
      : null;

  if (!basePath) {
    return null;
  }

  for (const extension of SOURCE_EXTENSIONS) {
    const filePath = `${basePath}${extension}`;
    if (existsSync(filePath)) {
      return filePath;
    }
  }

  if (existsSync(basePath) && statSync(basePath).isFile()) {
    return basePath;
  }

  for (const extension of SOURCE_EXTENSIONS) {
    const indexPath = join(basePath, `index${extension}`);
    if (existsSync(indexPath)) {
      return indexPath;
    }
  }

  return null;
}

function collectSourceSpecifiers(source: string) {
  const specifiers: string[] = [];
  const importRegex = /import\s+([\s\S]*?)\s+from\s+["']([^"']+)["']/g;
  const sideEffectImportRegex = /import\s+["']([^"']+)["']/g;
  const exportRegex = /export\s+([\s\S]*?)\s+from\s+["']([^"']+)["']/g;

  for (const match of source.matchAll(importRegex)) {
    const [, importClause, specifier] = match;
    if (importClause && specifier && !isTypeOnlyImport(importClause)) {
      specifiers.push(specifier);
    }
  }

  for (const match of source.matchAll(sideEffectImportRegex)) {
    const [, specifier] = match;
    if (specifier) {
      specifiers.push(specifier);
    }
  }

  for (const match of source.matchAll(exportRegex)) {
    const [, exportClause, specifier] = match;
    if (exportClause && specifier && !isTypeOnlyImport(exportClause)) {
      specifiers.push(specifier);
    }
  }

  return specifiers;
}

function collectImportGraph(entrypoints: string[]) {
  const visited = new Set<string>();
  const pending = entrypoints.map((entrypoint) =>
    isAbsolute(entrypoint) ? entrypoint : join(process.cwd(), entrypoint),
  );

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);
    const source = readFileSync(current, "utf8");

    for (const specifier of collectSourceSpecifiers(source)) {
      const importedPath = resolveSourceImport(current, specifier);
      if (importedPath?.startsWith(SOURCE_ROOT)) {
        pending.push(importedPath);
      }
    }
  }

  return [...visited].sort();
}

describe("public surface cache safety", () => {
  it("follows side-effect imports in import graph checks", () => {
    expect(
      collectSourceSpecifiers('import "@/components/auth-providers";'),
    ).toContain("@/components/auth-providers");
  });

  it("keeps auth-aware providers out of the root layout import graph", () => {
    const rootFiles = collectImportGraph(["src/app/layout.tsx"]);

    for (const absolutePath of rootFiles) {
      const source = readFileSync(absolutePath, "utf8");

      for (const marker of ROOT_CACHE_VARIANT_MARKERS) {
        expect(source, absolutePath).not.toContain(marker);
      }
    }
  });

  it("keeps the public route group out of authenticated providers", () => {
    const source = readSource("src/app/(public)/layout.tsx");

    expect(source).not.toContain("@clerk/nextjs");
    expect(source).not.toContain("AuthProviders");
    expect(source).not.toContain("DashboardProviders");
    expect(source).not.toContain("ClerkProvider");
    expect(source).not.toContain("PublicClientProviders");
    expect(source).not.toContain("TRPCReactProvider");
  });

  it("keeps public and membership import graphs free of Clerk auth", () => {
    const publicEntryPoints = [
      ...collectSourceFiles("src/app/(public)"),
      ...collectSourceFiles("src/app/start-membership"),
      "src/components/public-nav.tsx",
      "src/components/seller-intent-link.tsx",
      "src/hooks/use-feedback-url.ts",
    ];

    const publicFiles = collectImportGraph(publicEntryPoints);

    for (const absolutePath of publicFiles) {
      const source = readFileSync(absolutePath, "utf8");

      expect(source, absolutePath).not.toContain("@clerk/nextjs");
      expect(source, absolutePath).not.toContain("useAuth(");
      expect(source, absolutePath).not.toContain("useUser(");
      expect(source, absolutePath).not.toContain("SignInButton");
      expect(source, absolutePath).not.toContain("SignUpButton");
      expect(source, absolutePath).not.toContain("UserButton");
    }
  });

  it("renders public navigation without Clerk auth state", () => {
    const source = readSource("src/components/public-nav.tsx");

    expect(source).not.toContain("@clerk/nextjs");
    expect(source).not.toContain("DashboardButton");
    expect(source).not.toContain("PublicDashboardLink");
    expect(source).not.toContain("useAuth");
    expect(source).not.toContain("SignInButton");
    expect(source).toContain("DASHBOARD_SIGN_IN_PATH");
  });

  it("keeps public feedback URLs independent from Clerk and tRPC", () => {
    const source = readSource("src/hooks/use-feedback-url.ts");

    expect(source).not.toContain("@clerk/nextjs");
    expect(source).not.toContain("@/trpc/react");
    expect(source).not.toContain("api.user.getCurrentUser");
    expect(source).toContain("getPublicFeedbackUrl");
  });

  it("keeps public breadcrumbs on server-provided data", () => {
    const source = readSource(
      "src/app/(public)/_components/public-breadcrumbs.tsx",
    );

    expect(source).not.toContain("@/trpc/react");
    expect(source).not.toContain("api.public");
    expect(source).not.toContain("withPublicClientQueryCache");
  });

  it("keeps the dashboard wrapped in authenticated app providers", () => {
    const dashboardLayout = readSource("src/app/dashboard/layout.tsx");
    const authProviders = readSource("src/components/auth-providers.tsx");
    const dashboardProviders = readSource("src/components/dashboard-providers.tsx");

    expect(dashboardLayout).toContain("<DashboardProviders>");
    expect(authProviders).toContain("ClerkProvider");
    expect(authProviders).toContain(
      "signInUrl={SUBSCRIPTION_CONFIG.DASHBOARD_SIGN_IN_PATH}",
    );
    expect(authProviders).toContain(
      "signUpUrl={SUBSCRIPTION_CONFIG.SELLER_SIGNUP_PATH}",
    );
    expect(authProviders).toContain("TRPCReactProvider");
    expect(authProviders).toContain("PosthogUserIdentification");
    expect(dashboardProviders).not.toContain("PosthogUserIdentification");
    expect(dashboardProviders).not.toContain("AdminMenu");
    expect(dashboardProviders).not.toContain("SpeedInsights");
  });

  it("keeps non-dashboard auth layouts on the minimal auth provider", () => {
    expect(readSource("src/app/auth-error/layout.tsx")).toContain(
      "<AuthProviders>",
    );
    expect(readSource("src/app/onboarding/layout.tsx")).toContain(
      "<AuthProviders>",
    );
    expect(readSource("src/app/start-onboarding/layout.tsx")).toContain(
      "<AuthProviders>",
    );
    expect(readSource("src/app/start-membership/layout.tsx")).not.toContain(
      "AuthProviders",
    );
    expect(readSource("src/app/sign-up/layout.tsx")).toContain(
      "<AuthProviders>",
    );
    expect(readSource("src/app/sign-in/layout.tsx")).toContain(
      "<AuthProviders>",
    );
  });

  it("keeps public auth-start routes pointed at the right protected flows", () => {
    const signUp = readSource(
      "src/app/sign-up/sign-up-page-client.tsx",
    );
    const signIn = readSource(
      "src/app/sign-in/sign-in-page-client.tsx",
    );

    expect(signUp).toContain("window.location.replace(ONBOARDING_PATH)");
    expect(signUp).toContain("forceRedirectUrl={ONBOARDING_PATH}");
    expect(signIn).toContain("window.location.replace(DASHBOARD_PATH)");
    expect(signIn).toContain("forceRedirectUrl={DASHBOARD_PATH}");
    expect(signIn).toContain("signUpForceRedirectUrl={ONBOARDING_PATH}");
  });

  it("keeps public app-router RSC fetches out of long-lived public caches", () => {
    const proxy = readSource("src/proxy.ts");

    expect(proxy).toContain("isAppRouterRscRequest");
    expect(proxy).toContain('req.nextUrl.searchParams.has("_rsc")');
    expect(proxy).toContain('req.headers.get("rsc") === "1"');
    expect(proxy).toContain('response.headers.set("Cache-Control", "no-store")');
    expect(proxy).toContain("!isProtectedRoute(req)");
    expect(proxy).toContain('key: "_rsc"');
    expect(proxy).toContain('key: "rsc"');
  });
});
