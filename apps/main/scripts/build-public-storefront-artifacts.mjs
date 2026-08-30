#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  stat,
  unlink,
  utimes,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { getPublicStorefrontSnapshot } from "./storefront/public-storefront-data.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDirectory, "..");
const manifestFormatVersion = 1;
const artifactRetentionMilliseconds = 7 * 24 * 60 * 60 * 1_000;
const staleLockMilliseconds = 6 * 60 * 60 * 1_000;
const artifactFilePattern = /^[a-f0-9]{64}\.json$/;
const liveReplicaProductionPath = "/data/turso-replica.db";

function parseArgs(args = process.argv.slice(2)) {
  const normalizedArgs = args[0] === "--" ? args.slice(1) : args;
  const sellerIds = [];
  let source = null;
  let output = null;

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const argument = normalizedArgs[index];
    const value = normalizedArgs[index + 1];
    if (!["--source", "--output", "--seller-id"].includes(argument)) {
      throw new Error(`Unexpected argument: ${argument}`);
    }
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}.`);
    }

    if (argument === "--source") {
      if (source) {
        throw new Error("--source can be specified only once.");
      }
      source = value;
    } else if (argument === "--output") {
      if (output) {
        throw new Error("--output can be specified only once.");
      }
      output = value;
    } else {
      sellerIds.push(value);
    }
    index += 1;
  }

  if (!source) {
    throw new Error("--source is required.");
  }
  if (!output) {
    throw new Error("--output is required.");
  }
  if (sellerIds.length === 0) {
    throw new Error("At least one --seller-id is required.");
  }
  if (new Set(sellerIds).size !== sellerIds.length) {
    throw new Error("Each --seller-id must be unique.");
  }

  return { output, sellerIds, source };
}

function normalizeLocalPath(input) {
  if (input.includes("://") && !input.startsWith("file:")) {
    throw new Error(`Remote database sources are not supported: ${input}`);
  }

  const withoutScheme = input.startsWith("file:") ? input.slice(5) : input;
  if (!withoutScheme) {
    throw new Error("The database source path cannot be empty.");
  }

  return path.resolve(appRoot, withoutScheme);
}

async function assertSafeSource(sourcePath) {
  const sourceStat = await stat(sourcePath).catch(() => null);
  if (!sourceStat?.isFile()) {
    throw new Error(`The database source does not exist: ${sourcePath}`);
  }

  const configuredLiveReplica = process.env.TURSO_EMBEDDED_REPLICA_URL;
  const configuredLiveReplicaPath = configuredLiveReplica?.startsWith("file:")
    ? normalizeLocalPath(configuredLiveReplica)
    : null;
  const resolvedSource = await realpath(sourcePath);
  const resolvedConfiguredReplica = configuredLiveReplicaPath
    ? await realpath(configuredLiveReplicaPath).catch(
        () => configuredLiveReplicaPath,
      )
    : null;

  if (
    resolvedSource === liveReplicaProductionPath ||
    resolvedSource === resolvedConfiguredReplica
  ) {
    throw new Error(
      "The builder must use the dedicated synced storefront source replica, not the live embedded replica.",
    );
  }
}

function isFileExistsError(error) {
  return error instanceof Error && error.code === "EEXIST";
}

function isMissingFileError(error) {
  return error instanceof Error && error.code === "ENOENT";
}

async function syncDirectory(directoryPath) {
  const handle = await open(directoryPath, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function writeDurableFile(filePath, contents) {
  const handle = await open(filePath, "wx", 0o644);
  try {
    await handle.writeFile(contents, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function acquireBuildLock(outputRoot) {
  const lockPath = path.join(outputRoot, ".build.lock");

  async function acquire() {
    try {
      const handle = await open(lockPath, "wx", 0o644);
      await handle.writeFile(
        `${JSON.stringify({ createdAt: new Date().toISOString(), pid: process.pid })}\n`,
        "utf8",
      );
      await handle.sync();

      return async () => {
        await handle.close();
        await unlink(lockPath).catch((error) => {
          if (!isMissingFileError(error)) {
            throw error;
          }
        });
      };
    } catch (error) {
      if (!isFileExistsError(error)) {
        throw error;
      }

      const lockStat = await stat(lockPath);
      if (Date.now() - lockStat.mtimeMs <= staleLockMilliseconds) {
        throw new Error("A storefront artifact build is already running.");
      }

      await unlink(lockPath);
      return acquire();
    }
  }

  return acquire();
}

function getRepresentationMetadata(body, sellerId) {
  const bodyDigest = createHash("sha256").update(body).digest();
  const artifactDigest = createHash("sha256")
    .update(sellerId)
    .update("\0")
    .update(body)
    .digest("hex");

  return {
    artifact: `${artifactDigest}.json`,
    byteLength: Buffer.byteLength(body),
    etag: `W/"${bodyDigest.toString("base64url")}"`,
  };
}

async function publishArtifact(artifactDirectory, sellerId, body, metadata) {
  const artifactPath = path.join(artifactDirectory, metadata.artifact);
  const existingStat = await stat(artifactPath).catch((error) => {
    if (isMissingFileError(error)) {
      return null;
    }
    throw error;
  });
  if (existingStat) {
    if (!existingStat.isFile() || existingStat.size !== metadata.byteLength) {
      throw new Error(
        `The content-addressed artifact is invalid: ${metadata.artifact}`,
      );
    }

    const existingMetadata = getRepresentationMetadata(
      await readFile(artifactPath, "utf8"),
      sellerId,
    );
    if (
      existingMetadata.artifact !== metadata.artifact ||
      existingMetadata.etag !== metadata.etag
    ) {
      throw new Error(
        `The content-addressed artifact is corrupt: ${metadata.artifact}`,
      );
    }
    return;
  }

  const temporaryPath = path.join(
    artifactDirectory,
    `.${metadata.artifact}.${process.pid}.${randomUUID()}.tmp`,
  );
  try {
    await writeDurableFile(temporaryPath, body);
    const temporaryContents = await readFile(temporaryPath, "utf8");
    const verifiedMetadata = getRepresentationMetadata(
      temporaryContents,
      sellerId,
    );
    if (
      verifiedMetadata.artifact !== metadata.artifact ||
      verifiedMetadata.byteLength !== metadata.byteLength ||
      verifiedMetadata.etag !== metadata.etag
    ) {
      throw new Error("The temporary storefront artifact failed validation.");
    }

    await rename(temporaryPath, artifactPath);
    await syncDirectory(artifactDirectory);
  } finally {
    await unlink(temporaryPath).catch((error) => {
      if (!isMissingFileError(error)) {
        throw error;
      }
    });
  }
}

async function getPreviouslyReferencedArtifacts(currentDirectory) {
  const manifestPath = path.join(currentDirectory, "manifest.json");
  let manifestContents;

  try {
    manifestContents = await readFile(manifestPath, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return new Set();
    }
    throw error;
  }

  try {
    const manifest = JSON.parse(manifestContents);
    if (
      manifest.formatVersion !== manifestFormatVersion ||
      !Array.isArray(manifest.sellers) ||
      !manifest.sellers.every(
        (seller) =>
          seller &&
          typeof seller === "object" &&
          typeof seller.artifact === "string" &&
          artifactFilePattern.test(seller.artifact),
      )
    ) {
      return null;
    }

    return new Set(manifest.sellers.map((seller) => seller.artifact));
  } catch {
    return null;
  }
}

async function refreshRetentionClock(artifactDirectory, artifactNames) {
  if (!artifactNames) {
    return;
  }

  const retainedAt = new Date();
  for (const artifactName of artifactNames) {
    await utimes(
      path.join(artifactDirectory, artifactName),
      retainedAt,
      retainedAt,
    ).catch((error) => {
      if (!isMissingFileError(error)) {
        throw error;
      }
    });
  }
}

async function publishManifest(currentDirectory, manifest) {
  const manifestPath = path.join(currentDirectory, "manifest.json");
  const temporaryPath = path.join(
    currentDirectory,
    `.manifest.${process.pid}.${randomUUID()}.tmp`,
  );
  const contents = `${JSON.stringify(manifest)}\n`;

  try {
    await writeDurableFile(temporaryPath, contents);
    const parsedManifest = JSON.parse(await readFile(temporaryPath, "utf8"));
    if (
      parsedManifest.formatVersion !== manifestFormatVersion ||
      !Array.isArray(parsedManifest.sellers) ||
      parsedManifest.sellers.length !== manifest.sellers.length
    ) {
      throw new Error("The temporary storefront manifest failed validation.");
    }

    await rename(temporaryPath, manifestPath);
    await syncDirectory(currentDirectory);
  } finally {
    await unlink(temporaryPath).catch((error) => {
      if (!isMissingFileError(error)) {
        throw error;
      }
    });
  }
}

async function removeExpiredArtifacts(artifactDirectory, referencedArtifacts) {
  const retentionCutoff = Date.now() - artifactRetentionMilliseconds;
  let removedCount = 0;

  for (const directoryEntry of await readdir(artifactDirectory, {
    withFileTypes: true,
  })) {
    if (
      !directoryEntry.isFile() ||
      !artifactFilePattern.test(directoryEntry.name) ||
      referencedArtifacts.has(directoryEntry.name)
    ) {
      continue;
    }

    const artifactPath = path.join(artifactDirectory, directoryEntry.name);
    const artifactStat = await stat(artifactPath);
    if (artifactStat.mtimeMs >= retentionCutoff) {
      continue;
    }

    await unlink(artifactPath);
    removedCount += 1;
  }

  if (removedCount > 0) {
    await syncDirectory(artifactDirectory);
  }
  return removedCount;
}

async function buildPublicStorefrontArtifacts(options) {
  const sourcePath = normalizeLocalPath(options.source);
  const outputRoot = path.resolve(appRoot, options.output);
  await assertSafeSource(sourcePath);
  await mkdir(outputRoot, { recursive: true });
  const artifactDirectory = path.join(outputRoot, "artifacts");
  const currentDirectory = path.join(outputRoot, "current");
  await mkdir(artifactDirectory, { recursive: true });
  await mkdir(currentDirectory, { recursive: true });
  const releaseBuildLock = await acquireBuildLock(outputRoot);
  let database = null;
  const generatedAt = new Date().toISOString();
  const sellers = [];

  try {
    const adapter = new PrismaBetterSqlite3(
      { url: `file:${sourcePath}` },
      { timestampFormat: "unixepoch-ms" },
    );
    database = new PrismaClient({ adapter, log: ["error"] });
    await database.$queryRawUnsafe("PRAGMA query_only = ON");
    const previouslyReferencedArtifacts =
      await getPreviouslyReferencedArtifacts(currentDirectory);

    for (const sellerId of options.sellerIds) {
      const snapshot = await getPublicStorefrontSnapshot(
        database,
        sellerId,
        generatedAt,
      );
      if (!snapshot) {
        throw new Error(
          `Configured storefront seller was not found: ${sellerId}`,
        );
      }

      const body = JSON.stringify(snapshot);
      const metadata = getRepresentationMetadata(body, sellerId);
      await publishArtifact(artifactDirectory, sellerId, body, metadata);
      sellers.push({ id: sellerId, ...metadata });
    }

    const manifest = {
      formatVersion: manifestFormatVersion,
      generatedAt,
      sellers,
    };
    await refreshRetentionClock(
      artifactDirectory,
      previouslyReferencedArtifacts,
    );
    await publishManifest(currentDirectory, manifest);
    const removedArtifacts = previouslyReferencedArtifacts
      ? await removeExpiredArtifacts(
          artifactDirectory,
          new Set(sellers.map((seller) => seller.artifact)),
        )
      : 0;

    return {
      generatedAt,
      outputRoot,
      removedArtifacts,
      sellers: sellers.map((seller) => ({
        id: seller.id,
        artifact: seller.artifact,
        byteLength: seller.byteLength,
      })),
    };
  } finally {
    await database?.$disconnect();
    await releaseBuildLock();
  }
}

export async function main(args = process.argv.slice(2)) {
  const result = await buildPublicStorefrontArtifacts(parseArgs(args));
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const isDirectExecution =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectExecution) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
