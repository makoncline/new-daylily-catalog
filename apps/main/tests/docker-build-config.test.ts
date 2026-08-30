import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "../..");

describe("Docker build cache and observability boundaries", () => {
  it("keeps the storefront artifact location and seller allowlist in the runtime contract", () => {
    const envSource = readFileSync(
      path.join(repoRoot, "apps/main/src/env.js"),
      "utf8",
    );
    const localTemplate = readFileSync(
      path.join(repoRoot, "apps/main/.env.example"),
      "utf8",
    );
    const vpsTemplate = readFileSync(
      path.join(repoRoot, "apps/main/deploy/vps/.env.example"),
      "utf8",
    );
    const turboConfig = JSON.parse(
      readFileSync(path.join(repoRoot, "turbo.json"), "utf8"),
    );

    for (const name of [
      "PUBLIC_STOREFRONT_ARTIFACT_ROOT",
      "PUBLIC_STOREFRONT_SELLER_IDS",
      "STOREFRONT_ARTIFACT_REFRESH_TOKEN",
    ]) {
      expect(envSource).toContain(`${name}: z.string()`);
      expect(envSource).toContain(`process.env.${name}`);
      expect(localTemplate).toContain(`${name}=`);
      expect(vpsTemplate).toContain(`${name}=`);
      expect(turboConfig.globalPassThroughEnv).toContain(name);
    }
  });

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

  it("keeps package-local storefront contract dependencies in clean builder stages", () => {
    const dockerfile = readFileSync(
      path.join(repoRoot, "apps/main/Dockerfile"),
      "utf8",
    );
    const contractPackage = JSON.parse(
      readFileSync(
        path.join(repoRoot, "packages/storefront-contract/package.json"),
        "utf8",
      ),
    );

    expect(contractPackage.dependencies).toHaveProperty("zod");
    expect(dockerfile).toContain(
      "COPY --from=deps /app/packages/storefront-contract/node_modules ./packages/storefront-contract/node_modules",
    );
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
    const dockerignore = readFileSync(
      path.join(repoRoot, ".dockerignore"),
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
    expect(dockerfile).not.toContain(
      "build-public-search-index.mjs ./apps/main/scripts/build-public-search-index.mjs",
    );
    expect(dockerfile).toContain(
      "build-public-search-index-target.mjs ./apps/main/scripts/build-public-search-index-target.mjs",
    );
    expect(dockerfile).toContain(
      "target-worker-stream.js ./apps/main/src/server/target-worker-stream.js",
    );
    expect(dockerfile).toContain(
      "build-public-search-index.js ./apps/main/src/server/search/build-public-search-index.js",
    );
    expect(dockerfile).not.toContain("sync-public-search-source-replica.mjs");
    expect(dockerfile).toContain(
      "build-public-parentage-index.mjs ./apps/main/scripts/build-public-parentage-index.mjs",
    );
    expect(dockerfile).toContain(
      "build-public-storefront-artifacts-target.mjs ./apps/main/scripts/build-public-storefront-artifacts-target.mjs",
    );
    expect(dockerfile).toContain(
      "storefront-artifact-refresh-watchdog.mjs ./apps/main/scripts/storefront-artifact-refresh-watchdog.mjs",
    );
    expect(dockerfile).toContain(
      "refresh-public-storefront-artifacts.mjs ./apps/main/scripts/refresh-public-storefront-artifacts.mjs",
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
    expect(dockerfile).toContain(
      'const storefrontBuilderRequire = createRequire("/app/apps/main/scripts/build-public-storefront-artifacts.mjs")',
    );
    expect(dockerfile).toContain(
      'for (const dependency of ["@daylily-catalog/storefront-contract", "node-html-parser"]) storefrontBuilderRequire(dependency)',
    );
    expect(dockerfile).toContain(
      'await import("file:///app/apps/main/scripts/build-public-storefront-artifacts.mjs")',
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
    expect(dockerfile).toContain("openssl ca-certificates sqlite3 tini");
    expect(dockerfile).toContain('ENTRYPOINT ["/usr/bin/tini", "--"]');
    expect(dockerfile).toContain(
      "FROM base AS storefront-refresh-watchdog-test",
    );
    expect(dockerfile).toContain(
      "storefront-refresh-watchdog-container-hang.mjs",
    );
    const compose = readFileSync(
      path.join(repoRoot, "apps/main/deploy/vps/compose.yaml"),
      "utf8",
    );
    expect(compose).toContain("restart: unless-stopped");
    const workflow = readFileSync(
      path.join(repoRoot, ".github/workflows/pr-docker-image.yml"),
      "utf8",
    );
    expect(workflow).toContain("--target storefront-refresh-watchdog-test");
    expect(workflow).toContain(
      'if [ "$watchdog_elapsed_seconds" -ge 5 ]; then',
    );
    expect(workflow).toContain('if [ "$watchdog_status" -eq 124 ]; then');
    expect(workflow).toContain('if [ "$watchdog_status" -ne 137 ]; then');
    expect(workflow).toContain("trap cleanup_watchdog_container EXIT");
    expect(dockerignore).toContain(
      "!apps/main/tests/fixtures/storefront-refresh-watchdog-container-hang.mjs",
    );
    expect(runtimePackage.dependencies).toEqual({
      "@aws-sdk/client-s3": appPackage.dependencies["@aws-sdk/client-s3"],
      "@daylily-catalog/storefront-contract":
        appPackage.dependencies["@daylily-catalog/storefront-contract"],
      "@libsql/client": appPackage.dependencies["@libsql/client"],
      "@prisma/adapter-better-sqlite3":
        appPackage.dependencies["@prisma/adapter-better-sqlite3"],
      "@prisma/adapter-libsql":
        appPackage.dependencies["@prisma/adapter-libsql"],
      "@prisma/client": appPackage.dependencies["@prisma/client"],
      "node-html-parser": appPackage.dependencies["node-html-parser"],
      sharp: appPackage.dependencies.sharp,
    });
  });
});
