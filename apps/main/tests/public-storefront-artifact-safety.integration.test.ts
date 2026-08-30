// @vitest-environment node

import { spawn } from "node:child_process";
import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { afterEach, describe, expect, it } from "vitest";

const buildScriptPath = path.join(
  process.cwd(),
  "scripts/build-public-storefront-artifacts.mjs",
);

const temporaryRoots = new Set<string>();

interface BuildDependencies {
  checkpoint?: (
    label: string,
    context: { artifactPath?: string },
  ) => Promise<void>;
  getSnapshot?: (sellerId: string, generatedAt: string) => Promise<unknown>;
  lockOptions?: {
    heartbeatMilliseconds: number;
    staleMilliseconds: number;
  };
}

interface BuildResult {
  ready: true;
  removedArtifacts: number | null;
}

interface BuilderModule {
  publishPublicStorefrontArtifacts: (
    options: { output: string; sellerIds: string[] },
    dependencies?: BuildDependencies,
  ) => Promise<BuildResult>;
}

async function loadBuilder(cacheKey: string) {
  return (await import(
    `${pathToFileURL(buildScriptPath).href}?${cacheKey}=${Date.now()}`
  )) as unknown as BuilderModule;
}

function parseJson<T>(contents: string) {
  return JSON.parse(contents) as T;
}

async function createTemporaryRoot(label: string) {
  const root = await mkdtemp(path.join(tmpdir(), label));
  temporaryRoots.add(root);
  return root;
}

async function waitForFile(filePath: string) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      await access(filePath);
      return;
    } catch {
      await delay(20);
    }
  }
  throw new Error(`Timed out while waiting for ${filePath}`);
}

function startBuilderChild(
  runnerPath: string,
  args: {
    gatePath: string;
    marker: string;
    outputRoot: string;
    readyPath: string;
  },
) {
  const child = spawn(
    process.execPath,
    [runnerPath, args.outputRoot, args.marker, args.readyPath, args.gatePath],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const completion = new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
    stderr: string;
    stdout: string;
  }>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => {
      resolve({ code, signal, stderr, stdout });
    });
  });
  return { child, completion };
}

afterEach(async () => {
  await Promise.all(
    [...temporaryRoots].map((root) =>
      rm(root, { force: true, recursive: true }),
    ),
  );
  temporaryRoots.clear();
});

describe("public storefront artifact publication safety", () => {
  it("rolls back a new artifact when publication fails before the manifest commit", async () => {
    const root = await createTemporaryRoot("storefront-publication-rollback-");
    const outputRoot = path.join(root, "output");
    const { publishPublicStorefrontArtifacts } = await loadBuilder("rollback");
    const dependencies = {
      getSnapshot: async (sellerId: string, generatedAt: string) => ({
        generatedAt,
        marker: "previous",
        seller: { id: sellerId },
      }),
    };

    await publishPublicStorefrontArtifacts(
      { output: outputRoot, sellerIds: ["seller"] },
      dependencies,
    );
    const manifestPath = path.join(outputRoot, "current", "manifest.json");
    const priorManifest = await readFile(manifestPath, "utf8");
    const priorArtifactNames = await readdir(
      path.join(outputRoot, "artifacts"),
    );

    for (const failureCheckpoint of [
      "before_manifest_commit",
      "after_manifest_rename_before_sync",
    ]) {
      await expect(
        publishPublicStorefrontArtifacts(
          { output: outputRoot, sellerIds: ["seller"] },
          {
            ...dependencies,
            checkpoint: async (label: string) => {
              if (label === failureCheckpoint) {
                throw new Error(`simulated failure at ${failureCheckpoint}`);
              }
            },
            getSnapshot: async (sellerId: string, generatedAt: string) => ({
              generatedAt,
              marker: "replacement",
              seller: { id: sellerId },
            }),
          },
        ),
      ).rejects.toThrow(`simulated failure at ${failureCheckpoint}`);

      expect(await readFile(manifestPath, "utf8")).toBe(priorManifest);
      expect(await readdir(path.join(outputRoot, "artifacts"))).toEqual(
        priorArtifactNames,
      );
      expect(await readdir(path.join(outputRoot, "current"))).toEqual([
        "manifest.json",
      ]);
      expect(await readdir(outputRoot)).toEqual(["artifacts", "current"]);
    }
  });

  it("removes its lock when acquisition setup fails after file creation", async () => {
    const root = await createTemporaryRoot("storefront-lock-setup-failure-");
    const outputRoot = path.join(root, "output");
    const lockPath = path.join(outputRoot, ".build.lock");
    const { publishPublicStorefrontArtifacts } =
      await loadBuilder("lock-setup");
    const dependencies = {
      getSnapshot: async () => ({ marker: "published" }),
    };

    await expect(
      publishPublicStorefrontArtifacts(
        { output: outputRoot, sellerIds: ["seller"] },
        {
          ...dependencies,
          checkpoint: async (label: string) => {
            if (label === "after_build_lock_created") {
              throw new Error("simulated acquisition setup failure");
            }
          },
        },
      ),
    ).rejects.toThrow("simulated acquisition setup failure");
    await expect(lstat(lockPath)).rejects.toMatchObject({ code: "ENOENT" });

    await expect(
      publishPublicStorefrontArtifacts(
        { output: outputRoot, sellerIds: ["seller"] },
        dependencies,
      ),
    ).resolves.toMatchObject({ ready: true });
  });

  it("installs content-addressed artifacts without replacing a concurrent final", async () => {
    const root = await createTemporaryRoot("storefront-no-clobber-");
    const outputRoot = path.join(root, "output");
    const { publishPublicStorefrontArtifacts } =
      await loadBuilder("no-clobber");
    const expectedBody = JSON.stringify({ marker: "same-content" });
    let contenderPath = "";
    let contenderIdentity: Awaited<ReturnType<typeof stat>> | null = null;

    const result = await publishPublicStorefrontArtifacts(
      { output: outputRoot, sellerIds: ["seller"] },
      {
        checkpoint: async (
          label: string,
          context: { artifactPath?: string },
        ) => {
          if (label !== "before_artifact_install") {
            return;
          }
          contenderPath = context.artifactPath!;
          await writeFile(contenderPath, expectedBody, { flag: "wx" });
          contenderIdentity = await stat(contenderPath);
        },
        getSnapshot: async () => ({ marker: "same-content" }),
      },
    );

    expect(result).toMatchObject({ ready: true });
    expect(await readFile(contenderPath, "utf8")).toBe(expectedBody);
    expect(await stat(contenderPath)).toMatchObject({
      dev: contenderIdentity!.dev,
      ino: contenderIdentity!.ino,
    });
  });

  it("sweeps only stale regular files and retains the replaced generation", async () => {
    const root = await createTemporaryRoot("storefront-safe-sweep-");
    const outputRoot = path.join(root, "output");
    const { publishPublicStorefrontArtifacts } =
      await loadBuilder("safe-sweep");
    let marker = "previous";
    const dependencies = {
      getSnapshot: async () => ({ marker }),
    };

    await publishPublicStorefrontArtifacts(
      { output: outputRoot, sellerIds: ["seller"] },
      dependencies,
    );
    const priorManifest = parseJson<{
      sellers: Array<{ artifact: string }>;
    }>(
      await readFile(path.join(outputRoot, "current", "manifest.json"), "utf8"),
    );
    const priorArtifactPath = path.join(
      outputRoot,
      "artifacts",
      priorManifest.sellers[0]!.artifact,
    );
    const artifactDirectory = path.join(outputRoot, "artifacts");
    const currentDirectory = path.join(outputRoot, "current");
    const orphanName = `${"a".repeat(64)}.json`;
    const artifactTempName = `.${"b".repeat(64)}.json.artifact.deadbeef.cafebabe.tmp`;
    const manifestTempName = ".manifest.deadbeef.cafebabe.tmp";
    const abandonedLockName = ".build.lock.release.deadbeef.cafebabe";
    const symlinkTempName = `.${"c".repeat(64)}.json.artifact.deadbeef.cafebabe.tmp`;
    const nestedManifestTempName = ".manifest.cafebabe.deadbeef.tmp";
    const sentinelPath = path.join(root, "sentinel");
    const staleAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1_000);
    await writeFile(path.join(artifactDirectory, orphanName), "orphan");
    await writeFile(
      path.join(artifactDirectory, artifactTempName),
      "temporary",
    );
    await writeFile(path.join(currentDirectory, manifestTempName), "temporary");
    await writeFile(path.join(outputRoot, abandonedLockName), "temporary");
    await writeFile(sentinelPath, "keep me");
    await symlink(sentinelPath, path.join(artifactDirectory, symlinkTempName));
    await mkdir(path.join(currentDirectory, nestedManifestTempName));
    for (const stalePath of [
      priorArtifactPath,
      path.join(artifactDirectory, orphanName),
      path.join(artifactDirectory, artifactTempName),
      path.join(currentDirectory, manifestTempName),
      path.join(outputRoot, abandonedLockName),
    ]) {
      await utimes(stalePath, staleAt, staleAt);
    }

    marker = "replacement";
    const result = await publishPublicStorefrontArtifacts(
      { output: outputRoot, sellerIds: ["seller"] },
      dependencies,
    );

    expect(result.removedArtifacts).toBe(1);
    expect((await stat(priorArtifactPath)).isFile()).toBe(true);
    for (const removedPath of [
      path.join(artifactDirectory, orphanName),
      path.join(artifactDirectory, artifactTempName),
      path.join(currentDirectory, manifestTempName),
      path.join(outputRoot, abandonedLockName),
    ]) {
      await expect(lstat(removedPath)).rejects.toMatchObject({
        code: "ENOENT",
      });
    }
    expect(
      (
        await lstat(path.join(artifactDirectory, symlinkTempName))
      ).isSymbolicLink(),
    ).toBe(true);
    expect(
      (
        await lstat(path.join(currentDirectory, nestedManifestTempName))
      ).isDirectory(),
    ).toBe(true);
    expect(await readFile(sentinelPath, "utf8")).toBe("keep me");
  });

  it("prevents a stale owner from deleting the replacement lease or publishing after takeover", async () => {
    const root = await createTemporaryRoot("storefront-lock-race-");
    const outputRoot = path.join(root, "output");
    const runnerPath = path.join(root, "builder-child.mjs");
    const readyA = path.join(root, "ready-a");
    const readyB = path.join(root, "ready-b");
    const gateA = path.join(root, "gate-a");
    const gateB = path.join(root, "gate-b");
    await writeFile(
      runnerPath,
      `
import { access, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { publishPublicStorefrontArtifacts } from ${JSON.stringify(pathToFileURL(buildScriptPath).href)};

const [output, marker, ready, gate] = process.argv.slice(2);

try {
  const result = await publishPublicStorefrontArtifacts(
    { output, sellerIds: ["seller"] },
    {
      checkpoint: async (label) => {
        if (label !== "before_manifest_commit") return;
        await writeFile(ready, marker);
        for (;;) {
          try {
            await access(gate);
            return;
          } catch {
            await delay(10);
          }
        }
      },
      getSnapshot: async (sellerId, generatedAt) => ({
        generatedAt,
        marker,
        seller: { id: sellerId },
      }),
      lockOptions: { heartbeatMilliseconds: 100, staleMilliseconds: 600 },
    },
  );
  process.stdout.write(JSON.stringify(result));
} catch (error) {
  process.stderr.write(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
`,
    );

    const childA = startBuilderChild(runnerPath, {
      gatePath: gateA,
      marker: "old-owner",
      outputRoot,
      readyPath: readyA,
    });
    let childB: ReturnType<typeof startBuilderChild> | null = null;
    try {
      await waitForFile(readyA);
      expect(childA.child.pid).toBeTypeOf("number");
      process.kill(childA.child.pid!, "SIGSTOP");

      const lockPath = path.join(outputRoot, ".build.lock");
      const oldLock = parseJson<{
        token: string;
      }>(await readFile(lockPath, "utf8"));
      const staleAt = new Date(Date.now() - 5_000);
      await utimes(lockPath, staleAt, staleAt);

      childB = startBuilderChild(runnerPath, {
        gatePath: gateB,
        marker: "new-owner",
        outputRoot,
        readyPath: readyB,
      });
      await waitForFile(readyB);
      const replacementLock = parseJson<{
        token: string;
      }>(await readFile(lockPath, "utf8"));
      expect(replacementLock.token).not.toBe(oldLock.token);

      process.kill(childA.child.pid!, "SIGCONT");
      await writeFile(gateA, "continue");
      const oldOwnerResult = await childA.completion;
      expect(oldOwnerResult.code).toBe(1);
      expect(oldOwnerResult.stderr).toContain(
        "storefront artifact build lease",
      );
      expect(
        parseJson<{ token: string }>(await readFile(lockPath, "utf8")),
      ).toMatchObject({ token: replacementLock.token });
      await expect(
        stat(path.join(outputRoot, "current", "manifest.json")),
      ).rejects.toMatchObject({ code: "ENOENT" });

      await writeFile(gateB, "continue");
      const newOwnerResult = await childB.completion;
      expect(newOwnerResult).toMatchObject({ code: 0, signal: null });
      expect(parseJson<BuildResult>(newOwnerResult.stdout)).toMatchObject({
        ready: true,
      });
      const manifest = parseJson<{
        sellers: Array<{ artifact: string }>;
      }>(
        await readFile(
          path.join(outputRoot, "current", "manifest.json"),
          "utf8",
        ),
      );
      const publishedBody = parseJson<{ marker: string }>(
        await readFile(
          path.join(outputRoot, "artifacts", manifest.sellers[0]!.artifact),
          "utf8",
        ),
      );
      expect(publishedBody.marker).toBe("new-owner");
      await expect(stat(lockPath)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      for (const running of [childA, ...(childB === null ? [] : [childB])]) {
        if (running.child.exitCode !== null) {
          continue;
        }
        try {
          process.kill(running.child.pid!, "SIGCONT");
        } catch {
          // The child can exit between the state check and the signal.
        }
        running.child.kill("SIGTERM");
        await running.completion.catch(() => undefined);
      }
    }
  }, 20_000);
});
