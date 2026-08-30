import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
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

import { classifyChangedFiles } from "./affected-apps.mjs";

const scriptPath = fileURLToPath(
  new URL("./affected-apps.mjs", import.meta.url),
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
        dependencies: { "@daylily-catalog/config": "workspace:*" },
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
    const storefrontCompose = readFileSync(
      path.join(repositoryRoot, "apps/storefront/deploy/vps/compose.yaml"),
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
      /TURSO_|PUBLIC_SNAPSHOT|TEST_BASE_URL/,
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
    assert.match(previewE2eWorkflow, /needs\.scope\.outputs\.main == 'true'/);
    assert.equal(
      mainVercel.ignoreCommand,
      "node ../../.github/scripts/affected-apps.mjs --vercel-ignore main",
    );
    assert.match(storefrontEnvironment, /STOREFRONT_DATA_SOURCE=remote/);
    assert.match(
      storefrontEnvironment,
      /STOREFRONT_API_BASE_URL=https:\/\/daylilycatalog\.com/,
    );
    assert.match(storefrontEnvironment, /STOREFRONT_SELLER_ID=/);
    assert.doesNotMatch(storefrontEnvironment, /TURSO_|PUBLIC_SNAPSHOT|SMTP_/);
    assert.doesNotMatch(storefrontCompose, /public-data|\.public-data/);
    assert.match(
      deploymentGuide,
      /Cloudflare-CDN-Cache-Control: public, max-age=43200, stale-while-revalidate=604800, stale-if-error=86400/,
    );
    assert.match(deploymentGuide, /Cache-Tag: daylily-storefront-public-html/);
    assert.match(deploymentGuide, /value: -1/);
    assert.match(deploymentGuide, /Accept: text\/markdown/);
    assert.match(deploymentGuide, /atomic rename/);
    assert.match(deploymentGuide, /every 24 hours/);
  });
});
