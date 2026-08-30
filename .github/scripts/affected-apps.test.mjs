import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { aliasVercelPreview } from "./alias-vercel-preview.mjs";
import { classifyChangedFiles } from "./affected-apps.mjs";

const scriptPath = fileURLToPath(
  new URL("./affected-apps.mjs", import.meta.url),
);
const provenanceScriptPath = fileURLToPath(
  new URL("./preview-candidate-provenance.mjs", import.meta.url),
);
const vercelOriginScriptPath = fileURLToPath(
  new URL("./vercel-preview-origin.mjs", import.meta.url),
);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "../..");

function runGit(cwd, arguments_) {
  return execFileSync("git", arguments_, { cwd, encoding: "utf8" }).trim();
}

function commitAll(cwd, message) {
  runGit(cwd, ["add", "--all"]);
  runGit(cwd, ["commit", "--quiet", "--message", message]);
  return runGit(cwd, ["rev-parse", "HEAD"]);
}

function lockfileFor(storefrontDependencyVersion) {
  return `lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .: {}

  apps/main:
    dependencies:
      '@daylily-catalog/config':
        specifier: workspace:*
        version: link:../../packages/config

  apps/storefront:
    dependencies:
      '@daylily-catalog/config':
        specifier: workspace:*
        version: link:../../packages/config
      '@daylily-catalog/ui':
        specifier: workspace:*
        version: link:../../packages/ui
      example-dependency:
        specifier: '*'
        version: ${storefrontDependencyVersion}

  packages/config: {}

  packages/ui: {}

packages:

  example-dependency@${storefrontDependencyVersion}:
    resolution: {integrity: sha512-${storefrontDependencyVersion.replaceAll(".", "")}}

snapshots:

  example-dependency@${storefrontDependencyVersion}: {}
`;
}

function createGitFixture() {
  const directory = mkdtempSync(path.join(tmpdir(), "affected-apps-git-"));
  runGit(directory, ["init", "--quiet"]);
  runGit(directory, ["config", "user.email", "ci@example.test"]);
  runGit(directory, ["config", "user.name", "CI Test"]);
  mkdirSync(path.join(directory, "apps/main/src"), { recursive: true });
  mkdirSync(path.join(directory, "apps/storefront/src"), { recursive: true });
  mkdirSync(path.join(directory, "packages/config/src"), { recursive: true });
  mkdirSync(path.join(directory, "packages/storefront-contract/src"), {
    recursive: true,
  });
  mkdirSync(path.join(directory, "packages/ui/src"), { recursive: true });
  writeFileSync(
    path.join(directory, "package.json"),
    `${JSON.stringify({ private: true, packageManager: "pnpm@9.15.9" }, null, 2)}\n`,
  );
  writeFileSync(
    path.join(directory, "pnpm-workspace.yaml"),
    "packages:\n  - apps/*\n  - packages/*\n",
  );
  writeFileSync(path.join(directory, "turbo.json"), '{"tasks":{}}\n');
  writeFileSync(
    path.join(directory, "apps/main/package.json"),
    `${JSON.stringify(
      {
        name: "@daylily-catalog/main",
        dependencies: {
          "@daylily-catalog/config": "workspace:*",
          "@daylily-catalog/storefront-contract": "workspace:*",
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    path.join(directory, "apps/storefront/package.json"),
    `${JSON.stringify(
      {
        name: "@daylily-catalog/storefront",
        dependencies: {
          "@daylily-catalog/config": "workspace:*",
          "@daylily-catalog/storefront-contract": "workspace:*",
          "@daylily-catalog/ui": "workspace:*",
          "example-dependency": "*",
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    path.join(directory, "packages/config/package.json"),
    '{"name":"@daylily-catalog/config"}\n',
  );
  writeFileSync(
    path.join(directory, "packages/storefront-contract/package.json"),
    '{"name":"@daylily-catalog/storefront-contract"}\n',
  );
  writeFileSync(
    path.join(directory, "packages/ui/package.json"),
    '{"name":"@daylily-catalog/ui"}\n',
  );
  writeFileSync(path.join(directory, "apps/main/src/moved.ts"), "export {}\n");
  writeFileSync(
    path.join(directory, "apps/storefront/src/page.ts"),
    "export {}\n",
  );
  writeFileSync(
    path.join(directory, "packages/config/src/index.ts"),
    "export {}\n",
  );
  writeFileSync(
    path.join(directory, "packages/storefront-contract/src/index.ts"),
    "export {}\n",
  );
  writeFileSync(
    path.join(directory, "packages/ui/src/index.ts"),
    "export {}\n",
  );
  writeFileSync(path.join(directory, "pnpm-lock.yaml"), lockfileFor("1.0.0"));
  return { base: commitAll(directory, "baseline"), directory };
}

function runClassifier(cwd, arguments_, environment = {}) {
  return spawnSync(process.execPath, [scriptPath, ...arguments_], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...environment },
  });
}

function runProvenance(cwd, head, ref, outputPath) {
  return spawnSync(
    process.execPath,
    [provenanceScriptPath, "--head", head, "--ref", ref],
    {
      cwd,
      encoding: "utf8",
      env: { ...process.env, GITHUB_OUTPUT: outputPath },
    },
  );
}

function runVercelOrigin(environment, outputPath) {
  return spawnSync(process.execPath, [vercelOriginScriptPath], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, ...environment, GITHUB_OUTPUT: outputPath },
  });
}

function realTurboEnvironment() {
  const turboBinary = path.join(repositoryRoot, "node_modules/.bin/turbo");
  return existsSync(turboBinary)
    ? { AFFECTED_APPS_TURBO_BINARY: turboBinary }
    : {};
}

describe("affected app classification", () => {
  it("keeps app and main runtime changes isolated", () => {
    assert.deepEqual(classifyChangedFiles(["apps/main/src/page.tsx"]), {
      main: true,
      storefront: false,
    });
    assert.deepEqual(classifyChangedFiles(["apps/storefront/src/page.tsx"]), {
      main: false,
      storefront: true,
    });
    assert.deepEqual(
      classifyChangedFiles(["packages/standalone-runtime/package.json"]),
      { main: true, storefront: false },
    );
    assert.deepEqual(
      classifyChangedFiles([
        ".github/scripts/preview-candidate-provenance.mjs",
      ]),
      { main: true, storefront: false },
    );
    assert.deepEqual(
      classifyChangedFiles([".github/scripts/vercel-preview-origin.mjs"]),
      { main: true, storefront: false },
    );
    assert.deepEqual(
      classifyChangedFiles([".github/scripts/alias-vercel-preview.mjs"]),
      { main: true, storefront: false },
    );
  });

  it("uses dependency results for package and lockfile changes", () => {
    assert.deepEqual(
      classifyChangedFiles(["pnpm-lock.yaml"], ["@daylily-catalog/storefront"]),
      { main: false, storefront: true },
    );
    assert.deepEqual(
      classifyChangedFiles(
        ["packages/ui/src/button.tsx"],
        ["@daylily-catalog/main", "@daylily-catalog/storefront"],
      ),
      { main: true, storefront: true },
    );
  });

  it("sends root build inputs to both apps and ignores documentation", () => {
    for (const filePath of [
      ".dockerignore",
      "package.json",
      "pnpm-workspace.yaml",
      "turbo.json",
      "patches/next.patch",
    ]) {
      assert.deepEqual(classifyChangedFiles([filePath]), {
        main: true,
        storefront: true,
      });
    }
    assert.deepEqual(classifyChangedFiles(["README.md", "AGENTS.md"]), {
      main: false,
      storefront: false,
    });
  });

  it("writes outputs that GitHub Actions can consume", () => {
    const temporaryDirectory = mkdtempSync(
      path.join(tmpdir(), "affected-apps-output-"),
    );
    const outputPath = path.join(temporaryDirectory, "github-output.txt");
    try {
      const command = runClassifier(
        repositoryRoot,
        [
          "--path",
          "apps/storefront/Dockerfile",
          "--path",
          "apps/main/Dockerfile",
        ],
        { GITHUB_OUTPUT: outputPath },
      );

      assert.equal(command.status, 0, command.stderr);
      assert.deepEqual(JSON.parse(command.stdout), {
        affected: { main: true, storefront: true },
        affectedPackages: [],
        files: ["apps/storefront/Dockerfile", "apps/main/Dockerfile"],
      });
      assert.equal(
        readFileSync(outputPath, "utf8"),
        "main=true\nstorefront=true\n",
      );
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("classifies both sides of a cross-app rename from a real Git diff", () => {
    const { base, directory } = createGitFixture();
    try {
      renameSync(
        path.join(directory, "apps/main/src/moved.ts"),
        path.join(directory, "apps/storefront/src/moved.ts"),
      );
      const head = commitAll(directory, "move file between apps");
      const command = runClassifier(directory, [
        "--base",
        base,
        "--head",
        head,
      ]);

      assert.equal(command.status, 0, command.stderr);
      assert.deepEqual(JSON.parse(command.stdout), {
        affected: { main: true, storefront: true },
        affectedPackages: [],
        files: ["apps/main/src/moved.ts", "apps/storefront/src/moved.ts"],
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("uses the real Turbo graph for shared package consumers", () => {
    const { base, directory } = createGitFixture();
    const turboEnvironment = realTurboEnvironment();
    try {
      writeFileSync(
        path.join(directory, "packages/ui/src/index.ts"),
        "export const changed = true;\n",
      );
      const uiHead = commitAll(directory, "change storefront UI package");
      const storefrontOnly = runClassifier(
        directory,
        ["--base", base, "--head", uiHead],
        turboEnvironment,
      );
      assert.equal(storefrontOnly.status, 0, storefrontOnly.stderr);
      assert.deepEqual(JSON.parse(storefrontOnly.stdout).affected, {
        main: false,
        storefront: true,
      });

      writeFileSync(
        path.join(directory, "packages/config/src/index.ts"),
        "export const changed = true;\n",
      );
      const configHead = commitAll(directory, "change shared config package");
      const both = runClassifier(
        directory,
        ["--base", uiHead, "--head", configHead],
        turboEnvironment,
      );
      assert.equal(both.status, 0, both.stderr);
      assert.deepEqual(JSON.parse(both.stdout).affected, {
        main: true,
        storefront: true,
      });

      writeFileSync(
        path.join(directory, "packages/storefront-contract/src/index.ts"),
        "export const changed = true;\n",
      );
      const contractHead = commitAll(directory, "change storefront contract");
      const contract = runClassifier(
        directory,
        ["--base", configHead, "--head", contractHead],
        turboEnvironment,
      );
      assert.equal(contract.status, 0, contract.stderr);
      assert.deepEqual(JSON.parse(contract.stdout).affected, {
        main: true,
        storefront: true,
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("uses the Turbo dependency result for a real lockfile diff", () => {
    const { base, directory } = createGitFixture();
    const turboEnvironment = realTurboEnvironment();
    try {
      writeFileSync(
        path.join(directory, "pnpm-lock.yaml"),
        lockfileFor("2.0.0"),
      );
      const head = commitAll(directory, "change storefront lock resolution");

      const storefrontOnly = runClassifier(
        directory,
        ["--base", base, "--head", head],
        turboEnvironment,
      );
      assert.equal(storefrontOnly.status, 0, storefrontOnly.stderr);
      assert.deepEqual(JSON.parse(storefrontOnly.stdout).affected, {
        main: false,
        storefront: true,
      });

      const unavailableTurbo = runClassifier(
        directory,
        ["--base", base, "--head", head],
        {
          AFFECTED_APPS_TURBO_BINARY: path.join(directory, "missing-turbo"),
        },
      );
      assert.equal(unavailableTurbo.status, 1);
      assert.equal(unavailableTurbo.stdout, "");
      assert.match(unavailableTurbo.stderr, /ENOENT|spawnSync/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("uses trusted Turbo instead of candidate-controlled tooling", () => {
    const { base, directory } = createGitFixture();
    const trustedDirectory = mkdtempSync(
      path.join(tmpdir(), "affected-apps-trusted-turbo-"),
    );
    const markerPath = path.join(directory, "candidate-turbo-ran");
    try {
      const candidateTurbo = path.join(directory, "node_modules/.bin/turbo");
      mkdirSync(path.dirname(candidateTurbo), { recursive: true });
      writeFileSync(
        candidateTurbo,
        `#!/bin/sh\ntouch "${markerPath}"\nprintf '%s\\n' '{"data":{"affectedPackages":{"items":[{"name":"@daylily-catalog/main"}]}}}'\n`,
      );
      chmodSync(candidateTurbo, 0o755);
      writeFileSync(
        path.join(directory, ".npmrc"),
        "registry=https://candidate.invalid/\n",
      );
      writeFileSync(
        path.join(directory, "packages/ui/src/index.ts"),
        "export const changed = true;\n",
      );
      const head = commitAll(directory, "add candidate-controlled tooling");

      const trustedTurbo = path.join(trustedDirectory, "turbo");
      writeFileSync(
        trustedTurbo,
        '#!/bin/sh\ntest "$CI" = "1"\ntest "$TURBO_DAEMON" = "false"\ntest "$TURBO_TELEMETRY_DISABLED" = "1"\nprintf \'%s\\n\' \'{"data":{"affectedPackages":{"items":[{"name":"@daylily-catalog/storefront"}]}}}\'\n',
      );
      chmodSync(trustedTurbo, 0o755);

      const command = runClassifier(
        directory,
        ["--base", base, "--head", head],
        { AFFECTED_APPS_TURBO_BINARY: trustedTurbo },
      );

      assert.equal(command.status, 0, command.stderr);
      const result = JSON.parse(command.stdout);
      assert.deepEqual(result.affected, {
        main: true,
        storefront: true,
      });
      assert.deepEqual(result.affectedPackages, [
        "@daylily-catalog/storefront",
      ]);
      assert.equal(existsSync(markerPath), false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
      rmSync(trustedDirectory, { recursive: true, force: true });
    }
  });

  it("skips a fork candidate that is not the head of an origin branch", () => {
    const { base, directory } = createGitFixture();
    const trustedOutput = path.join(directory, "trusted-output.txt");
    const forkOutput = path.join(directory, "fork-output.txt");
    try {
      runGit(directory, ["update-ref", "refs/remotes/origin/feature", base]);
      const trusted = runProvenance(directory, base, "feature", trustedOutput);
      assert.equal(trusted.status, 0, trusted.stderr);
      assert.deepEqual(JSON.parse(trusted.stdout), {
        reason: "same-repository-ref",
        trusted: true,
      });
      assert.match(readFileSync(trustedOutput, "utf8"), /trusted=true/);

      writeFileSync(
        path.join(directory, "apps/main/src/fork.ts"),
        "export const fork = true;\n",
      );
      const forkHead = commitAll(directory, "simulate fork candidate");
      const fork = runProvenance(directory, forkHead, "feature", forkOutput);
      assert.equal(fork.status, 0, fork.stderr);
      assert.deepEqual(JSON.parse(fork.stdout), {
        reason: "not-origin-head",
        trusted: false,
      });
      assert.match(readFileSync(forkOutput, "utf8"), /trusted=false/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("accepts only one exact HTTPS Vercel preview origin", () => {
    const temporaryDirectory = mkdtempSync(
      path.join(tmpdir(), "vercel-preview-origin-"),
    );
    const candidateSha = "0123456789abcdef0123456789abcdef01234567";
    const validOutput = path.join(temporaryDirectory, "valid-output.txt");
    const fallbackOutput = path.join(temporaryDirectory, "fallback-output.txt");
    try {
      const valid = runVercelOrigin(
        {
          DEPLOYMENT_SHA: candidateSha,
          DEPLOYMENT_ENVIRONMENT_URL:
            "https://daylily-catalog-git-feature-makoncline.vercel.app/",
        },
        validOutput,
      );
      assert.equal(valid.status, 0, valid.stderr);
      assert.deepEqual(JSON.parse(valid.stdout), {
        origin: "https://daylily-catalog-git-feature-makoncline.vercel.app",
        sha: candidateSha,
      });
      assert.equal(
        readFileSync(validOutput, "utf8"),
        `origin=https://daylily-catalog-git-feature-makoncline.vercel.app\nsha=${candidateSha}\n`,
      );

      const fallback = runVercelOrigin(
        {
          DEPLOYMENT_SHA: candidateSha,
          DEPLOYMENT_ENVIRONMENT_URL: "",
          DEPLOYMENT_TARGET_URL:
            "https://daylily-catalog-git-fallback-makoncline.vercel.app",
        },
        fallbackOutput,
      );
      assert.equal(fallback.status, 0, fallback.stderr);
      assert.equal(
        readFileSync(fallbackOutput, "utf8"),
        `origin=https://daylily-catalog-git-fallback-makoncline.vercel.app\nsha=${candidateSha}\n`,
      );

      for (const invalidUrl of [
        "http://preview.vercel.app",
        "https://vercel.app",
        "https://nested.preview.vercel.app",
        "https://preview.vercel.app.evil.example",
        "https://preview.vercel.app@evil.example",
        "https://preview.vercel.app/path",
        "https://preview.vercel.app?command=run",
        "https://preview.vercel.app:443",
        "https://preview.vercel.app/;touch-owned",
        `https://${"a".repeat(64)}.vercel.app`,
        " https://preview.vercel.app",
      ]) {
        const invalidOutput = path.join(
          temporaryDirectory,
          `invalid-output-${invalidUrl.length}.txt`,
        );
        const invalid = runVercelOrigin(
          {
            DEPLOYMENT_SHA: candidateSha,
            DEPLOYMENT_ENVIRONMENT_URL: invalidUrl,
            DEPLOYMENT_TARGET_URL: "https://valid-fallback.vercel.app",
          },
          invalidOutput,
        );
        assert.equal(invalid.status, 1, invalidUrl);
        assert.equal(invalid.stdout, "", invalidUrl);
        assert.match(invalid.stderr, /exact HTTPS Vercel origin/u);
        assert.equal(existsSync(invalidOutput), false);
      }

      const invalidSha = runVercelOrigin(
        {
          DEPLOYMENT_SHA: "abc123",
          DEPLOYMENT_ENVIRONMENT_URL: "https://preview.vercel.app",
        },
        path.join(temporaryDirectory, "invalid-sha-output.txt"),
      );
      assert.equal(invalidSha.status, 1);
      assert.match(invalidSha.stderr, /full commit SHA/u);
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("inspects the exact Vercel preview before it assigns an alias", async () => {
    const temporaryDirectory = mkdtempSync(
      path.join(tmpdir(), "vercel-preview-alias-"),
    );
    const outputPath = path.join(temporaryDirectory, "github-output.txt");
    const candidateSha = "0123456789abcdef0123456789abcdef01234567";
    const environment = {
      CANDIDATE_SHA: candidateSha,
      MAIN_VERCEL_PROJECT_ID: "prj_main",
      PREVIEW_ORIGIN: "https://daylily-catalog-abc.vercel.app",
      VERCEL_ORG_ID: "team_owner",
      VERCEL_TOKEN: "test-token",
    };
    const deployment = {
      id: "dpl_verified",
      meta: { githubCommitSha: candidateSha },
      ownerId: "team_owner",
      projectId: "prj_main",
      readyState: "READY",
      target: null,
      url: "daylily-catalog-abc.vercel.app",
    };

    try {
      const requests = [];
      const result = await aliasVercelPreview({
        environment,
        fetchImplementation: async (url, options) => {
          requests.push({ options, url });
          if (requests.length === 1) {
            return new Response(JSON.stringify(deployment), { status: 200 });
          }
          return new Response(
            JSON.stringify({
              alias: "01234567.deploy-preview.daylilycatalog.com",
              uid: "alias_verified",
            }),
            { status: 200 },
          );
        },
        outputPath,
      });

      assert.deepEqual(result, {
        alias: "01234567.deploy-preview.daylilycatalog.com",
        deploymentId: "dpl_verified",
      });
      assert.equal(requests.length, 2);
      assert.equal(
        requests[0].url,
        "https://api.vercel.com/v13/deployments/daylily-catalog-abc.vercel.app?teamId=team_owner&withGitRepoInfo=true",
      );
      assert.equal(requests[0].options.method, "GET");
      assert.equal(
        requests[0].options.headers.Authorization,
        "Bearer test-token",
      );
      assert.equal(
        requests[1].url,
        "https://api.vercel.com/v2/deployments/dpl_verified/aliases?teamId=team_owner",
      );
      assert.equal(requests[1].options.method, "POST");
      assert.deepEqual(JSON.parse(requests[1].options.body), {
        alias: "01234567.deploy-preview.daylilycatalog.com",
        redirect: null,
      });
      assert.equal(readFileSync(outputPath, "utf8"), "preview_hash=01234567\n");

      for (const [field, value] of [
        ["projectId", "prj_other"],
        ["ownerId", "team_other"],
        ["url", "other-preview.vercel.app"],
        ["meta", { githubCommitSha: "f".repeat(40) }],
        ["target", "production"],
        ["readyState", "BUILDING"],
      ]) {
        let requestCount = 0;
        await assert.rejects(
          aliasVercelPreview({
            environment,
            fetchImplementation: async () => {
              requestCount += 1;
              return new Response(
                JSON.stringify({ ...deployment, [field]: value }),
                { status: 200 },
              );
            },
          }),
          /does not match/u,
        );
        assert.equal(requestCount, 1, field);
      }

      let missingVariableRequestCount = 0;
      await assert.rejects(
        aliasVercelPreview({
          environment: { ...environment, MAIN_VERCEL_PROJECT_ID: "" },
          fetchImplementation: async () => {
            missingVariableRequestCount += 1;
            return new Response();
          },
        }),
        /MAIN_VERCEL_PROJECT_ID is required/u,
      );
      assert.equal(missingVariableRequestCount, 0);

      for (const invalidOrigin of [
        "http://preview.vercel.app",
        "https://nested.preview.vercel.app",
        "https://preview.vercel.app/path",
      ]) {
        let invalidOriginRequestCount = 0;
        await assert.rejects(
          aliasVercelPreview({
            environment: { ...environment, PREVIEW_ORIGIN: invalidOrigin },
            fetchImplementation: async () => {
              invalidOriginRequestCount += 1;
              return new Response();
            },
          }),
          /exact HTTPS Vercel origin/u,
        );
        assert.equal(invalidOriginRequestCount, 0);
      }
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("uses the affected classifier as the Vercel ignored-build command", () => {
    const { base, directory } = createGitFixture();
    try {
      writeFileSync(
        path.join(directory, "apps/storefront/src/page.ts"),
        "export const changed = true;\n",
      );
      const storefrontHead = commitAll(directory, "change storefront");
      const ignored = runClassifier(
        path.join(directory, "apps/main"),
        ["--vercel-ignore", "main"],
        {
          VERCEL: "1",
          VERCEL_GIT_PREVIOUS_SHA: base,
          VERCEL_GIT_COMMIT_SHA: storefrontHead,
        },
      );
      assert.equal(ignored.status, 0, ignored.stderr);

      writeFileSync(
        path.join(directory, "apps/main/src/main.ts"),
        "export const changed = true;\n",
      );
      const mainHead = commitAll(directory, "change main");
      const built = runClassifier(
        path.join(directory, "apps/main"),
        ["--vercel-ignore", "main"],
        {
          VERCEL: "1",
          VERCEL_GIT_PREVIOUS_SHA: storefrontHead,
          VERCEL_GIT_COMMIT_SHA: mainHead,
        },
      );
      assert.equal(built.status, 1);

      const unknownBase = runClassifier(
        path.join(directory, "apps/main"),
        ["--vercel-ignore", "main"],
        {
          VERCEL: "1",
          VERCEL_GIT_PREVIOUS_SHA: "missing-ref",
          VERCEL_GIT_COMMIT_SHA: mainHead,
        },
      );
      assert.equal(unknownBase.status, 1);
      assert.match(unknownBase.stderr, /failed|unknown|ambiguous|revision/i);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("keeps workflow release units separate and package-gated", () => {
    const readWorkflow = (name) =>
      readFileSync(
        path.join(repositoryRoot, ".github/workflows", name),
        "utf8",
      );
    const mainWorkflow = readWorkflow("pr-docker-image.yml");
    const prWorkflow = readWorkflow("pr-tests.yml");
    const storefrontWorkflow = readWorkflow("storefront-docker-image.yml");
    const previewAliasWorkflow = readWorkflow("preview-alias.yml");
    const previewE2eWorkflow = readWorkflow("e2e-on-preview.yml");
    const storefrontEnvironment = readFileSync(
      path.join(repositoryRoot, "apps/storefront/deploy/vps/.env.example"),
      "utf8",
    );
    const mainEnvironment = readFileSync(
      path.join(repositoryRoot, "apps/main/deploy/vps/.env.example"),
      "utf8",
    );
    const storefrontCompose = readFileSync(
      path.join(repositoryRoot, "apps/storefront/deploy/vps/compose.yaml"),
      "utf8",
    );
    const storefrontCaddy = readFileSync(
      path.join(repositoryRoot, "apps/storefront/deploy/vps/caddy-route.caddy"),
      "utf8",
    );
    const artifactRefreshService = readFileSync(
      path.join(
        repositoryRoot,
        "apps/main/deploy/vps/storefront-artifact-refresh.service.example",
      ),
      "utf8",
    );
    const artifactRefreshEnvironment = readFileSync(
      path.join(
        repositoryRoot,
        "apps/main/deploy/vps/storefront-artifact-refresh.env.example",
      ),
      "utf8",
    );
    const artifactRefreshTimer = readFileSync(
      path.join(
        repositoryRoot,
        "apps/main/deploy/vps/storefront-artifact-refresh.timer.example",
      ),
      "utf8",
    );
    const deploymentGuide = readFileSync(
      path.join(repositoryRoot, "docs/operations/deployment-boundaries.md"),
      "utf8",
    );
    const mainVercel = JSON.parse(
      readFileSync(path.join(repositoryRoot, "apps/main/vercel.json"), "utf8"),
    );

    assert.match(mainWorkflow, /needs\.scope\.outputs\.main == 'true'/);
    assert.match(mainWorkflow, /ghcr\.io\/makoncline\/daylilycatalog/);
    assert.match(mainWorkflow, /deploy\/daylilycatalog/);
    assert.match(
      mainWorkflow,
      /ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/,
    );

    assert.match(
      prWorkflow.split("\n  quality:")[0],
      /node --test \.github\/scripts\/affected-apps\.test\.mjs/,
    );
    assert.match(
      prWorkflow,
      /ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/,
    );
    assert.match(prWorkflow, /--fail-if-no-match lint/);
    assert.match(prWorkflow, /--fail-if-no-match test/);
    assert.match(
      prWorkflow,
      /storefront-contract:[\s\S]*needs\.scope\.outputs\.main == 'true' \|\| needs\.scope\.outputs\.storefront == 'true'/,
    );
    assert.match(
      prWorkflow,
      /@daylily-catalog\/storefront-contract --fail-if-no-match typecheck/,
    );
    assert.match(
      prWorkflow,
      /@daylily-catalog\/storefront-contract --fail-if-no-match exec node --version/,
    );
    assert.match(
      prWorkflow,
      /@daylily-catalog\/storefront-contract --fail-if-no-match test/,
    );

    assert.match(
      storefrontWorkflow,
      /needs\.scope\.outputs\.storefront == 'true'/,
    );
    assert.match(
      storefrontWorkflow,
      /ghcr\.io\/makoncline\/daylily-storefront/,
    );
    assert.match(storefrontWorkflow, /STOREFRONT_DATA_SOURCE: fixture/);
    assert.match(storefrontWorkflow, /STOREFRONT_INQUIRY_ADAPTER: stub/);
    assert.match(storefrontWorkflow, /BASE_URL: http:\/\/127\.0\.0\.1:3000/);
    assert.match(storefrontWorkflow, /--fail-if-no-match/);
    assert.doesNotMatch(
      storefrontWorkflow,
      /TURSO_|PUBLIC_SNAPSHOT|STOREFRONT_SELLER_ID|TEST_BASE_URL/,
    );
    assert.doesNotMatch(
      storefrontWorkflow,
      /deploy\.makon\.dev|daylily-public-html/,
    );
    assert.match(
      storefrontWorkflow,
      /ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/,
    );
    assert.match(previewAliasWorkflow, /needs\.scope\.outputs\.main == 'true'/);
    assert.doesNotMatch(previewAliasWorkflow, /workflow_dispatch/);
    assert.match(previewE2eWorkflow, /needs\.scope\.outputs\.main == 'true'/);

    for (const workflow of [previewAliasWorkflow, previewE2eWorkflow]) {
      const scope = workflow.split(/\n  (?:alias|e2e):/u)[0];
      assert.match(
        scope,
        /ref: \$\{\{ github\.event\.repository\.default_branch \}\}/,
      );
      assert.match(scope, /path: trusted/);
      assert.match(scope, /path: candidate/);
      assert.match(scope, /persist-credentials: false/);
      assert.match(scope, /working-directory: trusted/);
      assert.match(scope, /turbo@2\.9\.6/);
      assert.match(scope, /AFFECTED_APPS_TURBO_BINARY/);
      assert.match(
        scope,
        /node "\$GITHUB_WORKSPACE\/trusted\/\.github\/scripts\/affected-apps\.mjs"/,
      );
      assert.doesNotMatch(scope, /issues: write|pull-requests: write/);
    }

    const aliasJob = previewAliasWorkflow
      .split("\n  alias:")[1]
      .split("\n  comment:")[0];
    const commentJob = previewAliasWorkflow.split("\n  comment:")[1];
    assert.doesNotMatch(aliasJob, /issues: write|pull-requests: write/);
    assert.match(
      previewAliasWorkflow,
      /preview-candidate-provenance\.mjs.*--head "\$HEAD_SHA" --ref "\$CANDIDATE_REF"/,
    );
    assert.match(
      previewAliasWorkflow,
      /node "\$GITHUB_WORKSPACE\/trusted\/\.github\/scripts\/vercel-preview-origin\.mjs"/,
    );
    assert.match(
      previewAliasWorkflow,
      /needs\.scope\.outputs\.trusted_candidate == 'true'/,
    );
    assert.match(
      previewAliasWorkflow,
      /github\.event\.deployment_status\.creator\.login == 'vercel\[bot\]'/,
    );
    assert.match(
      previewAliasWorkflow,
      /github\.event\.deployment_status\.state == 'success'/,
    );
    assert.match(
      previewAliasWorkflow,
      /needs\.scope\.outputs\.preview_origin != ''/,
    );
    assert.match(
      previewAliasWorkflow,
      /needs\.scope\.outputs\.candidate_sha == github\.event\.deployment\.sha/,
    );
    assert.match(
      previewAliasWorkflow,
      /github\.event\.deployment\.environment == 'Preview'/,
    );
    assert.doesNotMatch(previewAliasWorkflow, /contains\([^\n]*vercel\.app/u);
    assert.doesNotMatch(
      aliasJob,
      /\$\{\{ github\.event\.(?:deployment_status\.(?:environment_url|target_url)|inputs\.url)/u,
    );
    assert.match(
      aliasJob,
      /PREVIEW_ORIGIN: \$\{\{ needs\.scope\.outputs\.preview_origin \}\}/,
    );
    assert.match(aliasJob, /MAIN_VERCEL_PROJECT_ID: \$\{\{ vars\./);
    assert.match(aliasJob, /VERCEL_ORG_ID: \$\{\{ vars\./);
    assert.match(aliasJob, /VERCEL_TOKEN: \$\{\{ secrets\./);
    assert.match(aliasJob, /node \.github\/scripts\/alias-vercel-preview\.mjs/);
    assert.match(
      aliasJob,
      /ref: \$\{\{ github\.event\.repository\.default_branch \}\}/,
    );
    assert.match(aliasJob, /persist-credentials: false/);
    assert.doesNotMatch(aliasJob, /run:\s*[|>]/u);
    assert.doesNotMatch(aliasJob, /\bnpx\b/);
    assert.match(commentJob, /issues: write/);
    assert.match(commentJob, /pull-requests: write/);
    assert.doesNotMatch(commentJob, /actions\/checkout|\n\s+run:/);
    assert.doesNotMatch(
      previewE2eWorkflow,
      /issues: write|pull-requests: write/,
    );
    assert.match(
      previewE2eWorkflow,
      /preview-candidate-provenance\.mjs.*--head "\$HEAD_SHA" --ref "\$CANDIDATE_REF"/,
    );
    assert.match(
      previewE2eWorkflow,
      /needs\.scope\.outputs\.trusted_candidate == 'true'/,
    );
    assert.equal(
      mainVercel.ignoreCommand,
      "node ../../.github/scripts/affected-apps.mjs --vercel-ignore main",
    );
    assert.match(storefrontEnvironment, /STOREFRONT_DATA_SOURCE=remote/);
    assert.match(
      storefrontEnvironment,
      /STOREFRONT_API_BASE_URL=https:\/\/daylilycatalog\.com/,
    );
    assert.match(storefrontEnvironment, /STOREFRONT_SITE_KEY=rolling-oaks/);
    assert.match(
      storefrontEnvironment,
      /STOREFRONT_HOSTNAME=rolling-oaks-daylilies\.makon\.dev/,
    );
    assert.match(storefrontEnvironment, /STOREFRONT_SELLER_ID=3/);
    assert.doesNotMatch(storefrontEnvironment, /TURSO_|PUBLIC_SNAPSHOT|SMTP_/);
    assert.doesNotMatch(storefrontCompose, /public-data|\.public-data/);
    assert.match(storefrontCaddy, /header_up X-Forwarded-Proto https/);
    assert.match(storefrontCaddy, /header_up X-Forwarded-Host \{host\}/);
    assert.match(storefrontCaddy, /header_up X-Forwarded-Port 443/);
    assert.match(
      artifactRefreshService,
      /EnvironmentFile=\/srv\/stacks\/daylilycatalog\/\.env/,
    );
    assert.doesNotMatch(
      artifactRefreshService,
      /Environment=PUBLIC_STOREFRONT_SELLER_IDS/,
    );
    assert.match(
      artifactRefreshService,
      /STOREFRONT_DATA_CACHE_TAG=daylily-storefront-data/,
    );
    assert.match(
      artifactRefreshEnvironment,
      /^STOREFRONT_API_CLOUDFLARE_ZONE_ID=/mu,
    );
    assert.match(
      artifactRefreshEnvironment,
      /^STOREFRONT_API_CLOUDFLARE_CACHE_PURGE_TOKEN=/mu,
    );
    assert.doesNotMatch(
      artifactRefreshEnvironment,
      /^(?:CLOUDFLARE_ZONE_ID|CLOUDFLARE_CACHE_PURGE_TOKEN)=/mu,
    );
    const purgeTargetsLine = artifactRefreshEnvironment
      .split("\n")
      .find((line) =>
        line.startsWith("STOREFRONT_SITE_CLOUDFLARE_PURGE_TARGETS_JSON="),
      );
    assert.ok(purgeTargetsLine);
    const purgeTargetsValue = purgeTargetsLine.slice(
      purgeTargetsLine.indexOf("=") + 1,
    );
    const purgeTargets = JSON.parse(purgeTargetsValue.slice(1, -1));
    assert.deepEqual(purgeTargets, {
      "rolling-oaks": {
        hostname: "rolling-oaks-daylilies.makon.dev",
        zoneId: "",
        cachePurgeToken: "",
        cacheTag: "daylily-storefront-public-html",
      },
    });
    assert.match(artifactRefreshService, /Restart=on-failure/);
    assert.match(artifactRefreshTimer, /OnCalendar=daily/);
    assert.match(artifactRefreshTimer, /RandomizedDelaySec=2h/);
    assert.match(
      deploymentGuide,
      /Cloudflare-CDN-Cache-Control: public, max-age=43200, stale-while-revalidate=604800, stale-if-error=86400/,
    );
    assert.match(deploymentGuide, /Cache-Tag: daylily-storefront-public-html/);
    assert.match(deploymentGuide, /value: -1/);
    assert.match(deploymentGuide, /Accept: text\/markdown/);
    assert.match(deploymentGuide, /atomic rename/);
    assert.match(
      deploymentGuide,
      /\/srv\/stacks\/daylilycatalog\/data\/storefronts/,
    );
    assert.match(deploymentGuide, /\/data\/storefronts/);
    assert.match(deploymentGuide, /every 24 hours/);
    assert.match(deploymentGuide, /initial allowlist contains only `3`/);
    assert.match(
      deploymentGuide,
      /main stack environment is the only source for `PUBLIC_STOREFRONT_SELLER_IDS`/,
    );
    assert.match(deploymentGuide, /one isolated service and container/);
    assert.match(deploymentGuide, /Do not add a runtime host registry/);
    assert.match(deploymentGuide, /mismatch must stop startup/);
    assert.match(
      deploymentGuide,
      /purge `daylily-storefront-data` in the API zone[\s\S]*Only after that succeeds can it purge `daylily-storefront-public-html` in each affected site's own zone/,
    );
    assert.match(deploymentGuide, /more than 26 hours old/);
    assert.match(deploymentGuide, /PUBLIC_STOREFRONT_SELLER_IDS/);
    assert.match(deploymentGuide, /It is separate from each site stack's/);
    assert.match(deploymentGuide, /bypass_by_default/);
    assert.match(
      deploymentGuide,
      /exact hostname selected by `STOREFRONT_HOSTNAME`/,
    );
    assert.match(deploymentGuide, /anonymous `GET` and `HEAD`/);
    assert.match(deploymentGuide, /Authorization/);
    assert.match(deploymentGuide, /__session/);
    assert.match(deploymentGuide, /__session_/);
    assert.match(deploymentGuide, /do not exclude every cookie/);
    assert.match(deploymentGuide, /_rsc/);
    assert.match(deploymentGuide, /text\/x-component/);
    assert.match(deploymentGuide, /prefetch/);
    assert.match(deploymentGuide, /text\/markdown/);
    assert.match(deploymentGuide, /default full-URL cache key/);
    assert.match(deploymentGuide, /Do not add a route allowlist/);
    assert.doesNotMatch(deploymentGuide, /Make only these API routes eligible/);
    assert.match(
      deploymentGuide,
      /Every cacheable response on the storefront hostname,[\s\S]*uses the explicit header and `daylily-storefront-public-html` tag/,
    );
    assert.match(
      deploymentGuide,
      /main catalog artifact endpoint uses `daylily-storefront-data` in the separate API zone/,
    );
    assert.match(deploymentGuide, /rolling-oaks-daylilies\.makon\.dev/);
    assert.match(deploymentGuide, /rollingoaksdaylilies\.com/);
    assert.match(deploymentGuide, /www\.rollingoaksdaylilies\.com/);
    assert.match(deploymentGuide, /select exactly one allowed triple/);
    assert.doesNotMatch(storefrontEnvironment, /STOREFRONT_INQUIRY_URL/);
    assert.match(storefrontEnvironment, /STOREFRONT_INQUIRY_TOKEN=/);
    assert.match(
      mainEnvironment,
      /STOREFRONT_INQUIRY_TOKENS_JSON='\{"3":""\}'/,
    );
    assert.doesNotMatch(mainEnvironment, /^STOREFRONT_INQUIRY_TOKEN=/mu);
    assert.match(deploymentGuide, /distinct bearer tokens/);
  });
});
