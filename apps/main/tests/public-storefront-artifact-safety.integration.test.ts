// @vitest-environment node

import { spawn } from "node:child_process";
import {
  access,
  link,
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
import { afterEach, describe, expect, it, vi } from "vitest";

const buildScriptPath = path.join(
  process.cwd(),
  "scripts/build-public-storefront-artifacts.mjs",
);

const temporaryRoots = new Set<string>();
const originalLiveReplica = process.env.TURSO_EMBEDDED_REPLICA_URL;
const originalSellerIds = process.env.PUBLIC_STOREFRONT_SELLER_IDS;

interface TestDatabase {
  $disconnect: () => Promise<undefined>;
  $queryRawUnsafe: () => Promise<undefined>;
}

interface BuildDependencies {
  checkpoint?: (
    label: string,
    context: { artifactPath?: string },
  ) => Promise<void>;
  createDatabase?: (sourcePath: string) => Promise<TestDatabase>;
  getSnapshot?: (
    database: TestDatabase,
    sellerId: string,
    generatedAt: string,
  ) => Promise<unknown>;
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
  buildPublicStorefrontArtifacts: (
    options: { output: string; sellerIds: string[]; source: string },
    dependencies?: BuildDependencies,
  ) => Promise<BuildResult>;
  main: (args: string[], dependencies?: BuildDependencies) => Promise<void>;
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
    sourcePath: string;
  },
) {
  const child = spawn(
    process.execPath,
    [
      runnerPath,
      args.sourcePath,
      args.outputRoot,
      args.marker,
      args.readyPath,
      args.gatePath,
    ],
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
  if (originalLiveReplica === undefined) {
    delete process.env.TURSO_EMBEDDED_REPLICA_URL;
  } else {
    process.env.TURSO_EMBEDDED_REPLICA_URL = originalLiveReplica;
  }
  if (originalSellerIds === undefined) {
    delete process.env.PUBLIC_STOREFRONT_SELLER_IDS;
  } else {
    process.env.PUBLIC_STOREFRONT_SELLER_IDS = originalSellerIds;
  }

  await Promise.all(
    [...temporaryRoots].map((root) =>
      rm(root, { force: true, recursive: true }),
    ),
  );
  temporaryRoots.clear();
});

describe("public storefront artifact publication safety", () => {
  it("uses the trimmed seller allowlist and rejects empty or duplicate values", async () => {
    const root = await createTemporaryRoot("storefront-seller-allowlist-");
    const sourcePath = path.join(root, "source.sqlite");
    const outputRoot = path.join(root, "output");
    await writeFile(sourcePath, "test source seam");
    const { main } = await loadBuilder("seller-allowlist");
    const dependencies = {
      createDatabase: async () => ({
        $disconnect: async () => undefined,
        $queryRawUnsafe: async () => undefined,
      }),
      getSnapshot: async (_database: unknown, sellerId: string) => ({
        seller: { id: sellerId },
      }),
    };
    const stdoutWrite = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    try {
      process.env.PUBLIC_STOREFRONT_SELLER_IDS = " seller-a, seller-b ";
      await main(
        ["--source", sourcePath, "--output", outputRoot],
        dependencies,
      );
      const manifest = parseJson<{ sellers: Array<{ id: string }> }>(
        await readFile(
          path.join(outputRoot, "current", "manifest.json"),
          "utf8",
        ),
      );
      expect(manifest.sellers.map((seller) => seller.id)).toEqual([
        "seller-a",
        "seller-b",
      ]);

      const invalidAllowlistCases = [
        [
          "seller-a,,seller-b",
          "PUBLIC_STOREFRONT_SELLER_IDS cannot contain an empty seller ID.",
        ],
        ["seller-a,seller-a", "Each storefront seller ID must be unique."],
      ] as const;
      for (const [value, message] of invalidAllowlistCases) {
        process.env.PUBLIC_STOREFRONT_SELLER_IDS = value;
        await expect(
          main(
            [
              "--source",
              sourcePath,
              "--output",
              path.join(root, `invalid-${value.length}`),
            ],
            dependencies,
          ),
        ).rejects.toThrow(message);
      }
    } finally {
      stdoutWrite.mockRestore();
    }
  });

  it.each(["hard link", "symbolic link"])(
    "rejects a %s alias of the live replica before it creates output",
    async (aliasType) => {
      const root = await createTemporaryRoot("storefront-source-safety-");
      const liveReplicaPath = path.join(root, "live.sqlite");
      const sourceAliasPath = path.join(root, "source.sqlite");
      const outputRoot = path.join(root, "output");
      await writeFile(liveReplicaPath, "not opened");
      if (aliasType === "hard link") {
        await link(liveReplicaPath, sourceAliasPath);
      } else {
        await symlink(liveReplicaPath, sourceAliasPath);
      }
      process.env.TURSO_EMBEDDED_REPLICA_URL = `file:${liveReplicaPath}`;

      const { buildPublicStorefrontArtifacts } =
        await loadBuilder("source-safety");

      await expect(
        buildPublicStorefrontArtifacts({
          output: outputRoot,
          sellerIds: ["seller"],
          source: sourceAliasPath,
        }),
      ).rejects.toThrow(
        "The builder must use the dedicated synced storefront source replica, not the live embedded replica.",
      );
      await expect(stat(outputRoot)).rejects.toMatchObject({ code: "ENOENT" });
    },
  );

  it("rolls back a new artifact when publication fails before the manifest commit", async () => {
    const root = await createTemporaryRoot("storefront-publication-rollback-");
    const sourcePath = path.join(root, "source.sqlite");
    const outputRoot = path.join(root, "output");
    await writeFile(sourcePath, "test source seam");
    const { buildPublicStorefrontArtifacts } = await loadBuilder("rollback");
    const database = {
      $disconnect: async () => undefined,
      $queryRawUnsafe: async () => undefined,
    };
    const dependencies = {
      createDatabase: async () => database,
      getSnapshot: async (
        _database: unknown,
        sellerId: string,
        generatedAt: string,
      ) => ({ generatedAt, marker: "previous", seller: { id: sellerId } }),
    };

    await buildPublicStorefrontArtifacts(
      { output: outputRoot, sellerIds: ["seller"], source: sourcePath },
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
        buildPublicStorefrontArtifacts(
          { output: outputRoot, sellerIds: ["seller"], source: sourcePath },
          {
            ...dependencies,
            checkpoint: async (label: string) => {
              if (label === failureCheckpoint) {
                throw new Error(`simulated failure at ${failureCheckpoint}`);
              }
            },
            getSnapshot: async (
              _database: unknown,
              sellerId: string,
              generatedAt: string,
            ) => ({
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
    const sourcePath = path.join(root, "source.sqlite");
    const outputRoot = path.join(root, "output");
    const lockPath = path.join(outputRoot, ".build.lock");
    await writeFile(sourcePath, "test source seam");
    const { buildPublicStorefrontArtifacts } = await loadBuilder("lock-setup");
    const dependencies = {
      createDatabase: async () => ({
        $disconnect: async () => undefined,
        $queryRawUnsafe: async () => undefined,
      }),
      getSnapshot: async () => ({ marker: "published" }),
    };

    await expect(
      buildPublicStorefrontArtifacts(
        { output: outputRoot, sellerIds: ["seller"], source: sourcePath },
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
      buildPublicStorefrontArtifacts(
        { output: outputRoot, sellerIds: ["seller"], source: sourcePath },
        dependencies,
      ),
    ).resolves.toMatchObject({ ready: true });
  });

  it("installs content-addressed artifacts without replacing a concurrent final", async () => {
    const root = await createTemporaryRoot("storefront-no-clobber-");
    const sourcePath = path.join(root, "source.sqlite");
    const outputRoot = path.join(root, "output");
    await writeFile(sourcePath, "test source seam");
    const { buildPublicStorefrontArtifacts } = await loadBuilder("no-clobber");
    const expectedBody = JSON.stringify({ marker: "same-content" });
    let contenderPath = "";
    let contenderIdentity: Awaited<ReturnType<typeof stat>> | null = null;

    const result = await buildPublicStorefrontArtifacts(
      { output: outputRoot, sellerIds: ["seller"], source: sourcePath },
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
        createDatabase: async () => ({
          $disconnect: async () => undefined,
          $queryRawUnsafe: async () => undefined,
        }),
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
    const sourcePath = path.join(root, "source.sqlite");
    const outputRoot = path.join(root, "output");
    await writeFile(sourcePath, "test source seam");
    const { buildPublicStorefrontArtifacts } = await loadBuilder("safe-sweep");
    let marker = "previous";
    const dependencies = {
      createDatabase: async () => ({
        $disconnect: async () => undefined,
        $queryRawUnsafe: async () => undefined,
      }),
      getSnapshot: async () => ({ marker }),
    };

    await buildPublicStorefrontArtifacts(
      { output: outputRoot, sellerIds: ["seller"], source: sourcePath },
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
    const result = await buildPublicStorefrontArtifacts(
      { output: outputRoot, sellerIds: ["seller"], source: sourcePath },
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
    const sourcePath = path.join(root, "source.sqlite");
    const outputRoot = path.join(root, "output");
    const runnerPath = path.join(root, "builder-child.mjs");
    const readyA = path.join(root, "ready-a");
    const readyB = path.join(root, "ready-b");
    const gateA = path.join(root, "gate-a");
    const gateB = path.join(root, "gate-b");
    await writeFile(sourcePath, "test source seam");
    await writeFile(
      runnerPath,
      `
import { access, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { buildPublicStorefrontArtifacts } from ${JSON.stringify(pathToFileURL(buildScriptPath).href)};

const [source, output, marker, ready, gate] = process.argv.slice(2);
const database = {
  $disconnect: async () => undefined,
  $queryRawUnsafe: async () => undefined,
};

try {
  const result = await buildPublicStorefrontArtifacts(
    { output, sellerIds: ["seller"], source },
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
      createDatabase: async () => database,
      getSnapshot: async (_database, sellerId, generatedAt) => ({
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
      sourcePath,
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
        sourcePath,
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
