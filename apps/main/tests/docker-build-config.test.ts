import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "../..");

describe("Docker build cache and observability boundaries", () => {
  it("keeps PR cache exports lean without moving a separate compiler cache", () => {
    const dockerfile = readFileSync(
      path.join(repoRoot, "apps/main/Dockerfile"),
      "utf8",
    );
    const workflow = readFileSync(
      path.join(repoRoot, ".github/workflows/pr-docker-image.yml"),
      "utf8",
    );
    expect(dockerfile).not.toContain(
      "type=cache,target=/app/apps/main/.next/cache",
    );
    expect(dockerfile).toContain("FROM base AS builder");
    expect(dockerfile).toContain(
      "COPY --from=deps /app/node_modules ./node_modules",
    );
    expect(workflow).not.toContain("buildkit-cache-dance");
    expect(workflow).not.toContain("actions/cache");
    expect(workflow).toContain("actions/checkout@v7");
    expect(workflow).toContain("docker/setup-buildx-action@v4");
    expect(workflow).toContain("docker/build-push-action@v7");
    expect(workflow).toContain('CACHE_TO=""');
    expect(workflow).toContain('CACHE_TO="type=gha,mode=max"');
    expect(workflow).toContain(
      "cache-to: ${{ steps.meta.outputs.cache_to }}",
    );
    expect(
      readFileSync(path.join(repoRoot, ".dockerignore"), "utf8"),
    ).toContain("apps/*/Dockerfile");
  });

  it("disables Sentry sourcemaps only for non-deployed PR images", () => {
    const workflow = readFileSync(
      path.join(repoRoot, ".github/workflows/pr-docker-image.yml"),
      "utf8",
    );
    const nextConfig = readFileSync(
      path.join(repoRoot, "apps/main/next.config.js"),
      "utf8",
    );

    expect(workflow).toContain(
      "github.event_name != 'pull_request' && secrets.SENTRY_AUTH_TOKEN || ''",
    );
    expect(workflow).toContain('echo "SENTRY_SOURCEMAPS_DISABLED=1"');
    expect(nextConfig).toContain(
      'process.env.SENTRY_SOURCEMAPS_DISABLED === "1"',
    );
  });

  it("uses standalone tracing instead of copying the development dependency tree", () => {
    const dockerfile = readFileSync(
      path.join(repoRoot, "apps/main/Dockerfile"),
      "utf8",
    );
    const appPackage = JSON.parse(
      readFileSync(path.join(repoRoot, "apps/main/package.json"), "utf8"),
    );
    const runtimePackage = JSON.parse(
      readFileSync(
        path.join(repoRoot, "packages/standalone-runtime/package.json"),
        "utf8",
      ),
    );
    expect(dockerfile).not.toContain(
      "COPY --from=deps --chown=nextjs:nodejs /app/node_modules",
    );
    expect(dockerfile).toContain(
      "COPY --from=runtime-deps --chown=nextjs:nodejs /runtime/node_modules ./node_modules",
    );
    expect(dockerfile).not.toContain(
      "/runtime/node_modules ./apps/main/node_modules",
    );
    expect(dockerfile).toContain(
      'const serverRequire = createRequire("/app/apps/main/server.js")',
    );
    expect(dockerfile).toContain(
      'for (const dependency of ["@aws-sdk/client-s3", "@prisma/client", "@prisma/adapter-libsql", "@libsql/client"]) serverRequire(dependency)',
    );
    expect(dockerfile).toContain('const sharp = serverRequire("sharp")');
    expect(dockerfile).toContain("Object.keys(require.cache).find");
    expect(dockerfile).toContain("await sharp({ create:");
    expect(dockerfile).toContain('modulePath.includes("sharp")');
    expect(dockerfile).toContain(
      'if (sharpLdd.includes("not found")) process.exit(1)',
    );
    expect(dockerfile).toContain(
      "pnpm --filter @daylily-catalog/standalone-runtime --prod deploy /runtime",
    );
    expect(dockerfile).toContain(
      'cp -a "$source_modules/.prisma" "$runtime_modules/.prisma"',
    );
    expect(runtimePackage.dependencies).toEqual({
      "@aws-sdk/client-s3": appPackage.dependencies["@aws-sdk/client-s3"],
      "@libsql/client": appPackage.dependencies["@libsql/client"],
      "@prisma/adapter-libsql":
        appPackage.dependencies["@prisma/adapter-libsql"],
      "@prisma/client": appPackage.dependencies["@prisma/client"],
      sharp: appPackage.dependencies.sharp,
    });
  });
});
