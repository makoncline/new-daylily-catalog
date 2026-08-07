import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "../..");

describe("Docker build cache and observability boundaries", () => {
  it("keeps standalone output for Docker and delegates Vercel builds", () => {
    const appRoot = path.join(repoRoot, "apps/main");
    const turboConfig = JSON.parse(
      readFileSync(path.join(repoRoot, "turbo.json"), "utf8"),
    );
    const readOutput = (env: NodeJS.ProcessEnv) =>
      execFileSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          'import config from "./next.config.js"; process.stdout.write(String(config.output));',
        ],
        { cwd: appRoot, encoding: "utf8", env },
      );
    const localEnv = { ...process.env };
    delete localEnv.VERCEL;

    expect(readOutput(localEnv)).toBe("standalone");
    expect(readOutput({ ...process.env, VERCEL: "1" })).toBe("undefined");
    expect(turboConfig.tasks.build.env).toContain("VERCEL");
    expect(turboConfig.tasks["build:next"].env).toContain("VERCEL");
  });

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
    expect(workflow).toContain("cache-to: ${{ steps.meta.outputs.cache_to }}");
    expect(dockerfile).toContain("ENV NEXT_DEPLOYMENT_ID=$GIT_COMMIT_SHA");
    expect(workflow).toContain("CLOUDFLARE_CACHE_PURGE_TOKEN");
    expect(workflow).toContain("vars.CLOUDFLARE_ZONE_ID");
    expect(workflow).toContain(`--data '{"tags":["daylily-public-html"]}'`);
    expect(workflow.indexOf("deploy/daylilycatalog")).toBeLessThan(
      workflow.indexOf("/purge_cache"),
    );
    expect(
      readFileSync(path.join(repoRoot, ".dockerignore"), "utf8"),
    ).toContain("apps/*/Dockerfile");
  });

  it("keeps Sentry build environments distinct and disables sourcemaps only for non-deployed PR images", () => {
    const workflow = readFileSync(
      path.join(repoRoot, ".github/workflows/pr-docker-image.yml"),
      "utf8",
    );
    const prodLikeScript = readFileSync(
      path.join(
        repoRoot,
        "apps/main/scripts/prepare-prod-like-local-smoke.mjs",
      ),
      "utf8",
    );
    const nextConfig = readFileSync(
      path.join(repoRoot, "apps/main/next.config.js"),
      "utf8",
    );

    expect(workflow).toContain("SENTRY_ENVIRONMENT=$BUILD_ENVIRONMENT_NAME");
    expect(prodLikeScript).toContain(
      'setEnvValue(lines, "SENTRY_ENVIRONMENT", "prod-like")',
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
    expect(dockerfile.indexOf("COPY patches ./patches")).toBeLessThan(
      dockerfile.indexOf("RUN pnpm install --frozen-lockfile"),
    );
    expect(dockerfile).toContain(
      "COPY --from=runtime-deps --chown=nextjs:nodejs /runtime/node_modules ./node_modules",
    );
    expect(dockerfile).toContain(
      "sync-public-search-source-replica.mjs ./apps/main/scripts/sync-public-search-source-replica.mjs",
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
