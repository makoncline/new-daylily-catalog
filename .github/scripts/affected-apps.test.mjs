import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { classifyChangedFiles } from "./affected-apps.mjs";

const scriptPath = fileURLToPath(new URL("./affected-apps.mjs", import.meta.url));
const repositoryRoot = path.resolve(path.dirname(scriptPath), "../..");

describe("affected app classification", () => {
  it("keeps app-only changes isolated", () => {
    assert.deepEqual(classifyChangedFiles(["apps/main/src/page.tsx"]), {
      main: true,
      storefront: false,
    });
    assert.deepEqual(
      classifyChangedFiles(["apps/storefront/src/page.tsx"]),
      { main: false, storefront: true },
    );
  });

  it("sends root build inputs and shared packages to both apps", () => {
    for (const filePath of [
      ".dockerignore",
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "turbo.json",
      "patches/next.patch",
      "packages/catalog-read/src/index.ts",
      "packages/config/tsconfig/base.json",
    ]) {
      assert.deepEqual(classifyChangedFiles([filePath]), {
        main: true,
        storefront: true,
      });
    }
  });

  it("keeps the main standalone runtime package scoped to main", () => {
    assert.deepEqual(
      classifyChangedFiles(["packages/standalone-runtime/package.json"]),
      { main: true, storefront: false },
    );
  });

  it("does not build an app for unrelated repository documentation", () => {
    assert.deepEqual(classifyChangedFiles(["README.md", "AGENTS.md"]), {
      main: false,
      storefront: false,
    });
  });

  it("writes outputs that GitHub Actions can consume", () => {
    const temporaryDirectory = mkdtempSync(
      path.join(tmpdir(), "affected-apps-"),
    );
    const outputPath = path.join(temporaryDirectory, "github-output.txt");
    const stdout = execFileSync(
      process.execPath,
      [
        scriptPath,
        "--path",
        "apps/storefront/Dockerfile",
        "--path",
        "packages/catalog-read/src/index.ts",
      ],
      {
        encoding: "utf8",
        env: { ...process.env, GITHUB_OUTPUT: outputPath },
      },
    );

    assert.deepEqual(JSON.parse(stdout), {
      affected: { main: true, storefront: true },
      files: [
        "apps/storefront/Dockerfile",
        "packages/catalog-read/src/index.ts",
      ],
    });
    assert.equal(
      readFileSync(outputPath, "utf8"),
      "main=true\nstorefront=true\n",
    );
  });

  it("keeps workflow release units separate", () => {
    const readWorkflow = (name) =>
      readFileSync(
        path.join(repositoryRoot, ".github/workflows", name),
        "utf8",
      );
    const mainWorkflow = readWorkflow("pr-docker-image.yml");
    const storefrontWorkflow = readWorkflow("storefront-docker-image.yml");
    const previewAliasWorkflow = readWorkflow("preview-alias.yml");
    const previewE2eWorkflow = readWorkflow("e2e-on-preview.yml");

    assert.match(mainWorkflow, /needs\.scope\.outputs\.main == 'true'/);
    assert.match(mainWorkflow, /ghcr\.io\/makoncline\/daylilycatalog/);
    assert.match(mainWorkflow, /deploy\/daylilycatalog/);

    assert.match(
      storefrontWorkflow,
      /needs\.scope\.outputs\.storefront == 'true'/,
    );
    assert.match(
      storefrontWorkflow,
      /ghcr\.io\/makoncline\/daylily-storefront/,
    );
    assert.match(storefrontWorkflow, /storefront-preview/);
    assert.match(storefrontWorkflow, /storefront-production/);
    assert.doesNotMatch(storefrontWorkflow, /deploy\.makon\.dev/);
    assert.doesNotMatch(storefrontWorkflow, /daylily-public-html/);
    assert.match(
      previewAliasWorkflow,
      /needs\.scope\.outputs\.main == 'true'/,
    );
    assert.match(
      previewE2eWorkflow,
      /needs\.scope\.outputs\.main == 'true'/,
    );
  });
});
