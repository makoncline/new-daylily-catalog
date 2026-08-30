#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import {
  link,
  lstat,
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
const artifactTemporaryFilePattern =
  /^\.[a-f0-9]{64}\.json\.artifact\.[a-f0-9-]+\.[a-f0-9-]+\.tmp$/;
const manifestTemporaryFilePattern =
  /^\.manifest\.[a-f0-9-]+\.[a-f0-9-]+\.tmp$/;
const abandonedLockFilePattern = /^\.build\.lock\.(stale|release)\./;
const liveReplicaProductionPath = "/data/turso-replica.db";

function validateSellerIds(sellerIds) {
  if (!Array.isArray(sellerIds) || sellerIds.length === 0) {
    throw new Error("At least one storefront seller ID is required.");
  }

  const normalizedSellerIds = sellerIds.map((sellerId) => {
    if (typeof sellerId !== "string" || sellerId.trim().length === 0) {
      throw new Error("Storefront seller IDs cannot be empty.");
    }
    return sellerId.trim();
  });

  if (new Set(normalizedSellerIds).size !== normalizedSellerIds.length) {
    throw new Error("Each storefront seller ID must be unique.");
  }

  return normalizedSellerIds;
}

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
    const configuredSellerIds = process.env.PUBLIC_STOREFRONT_SELLER_IDS;
    if (!configuredSellerIds) {
      throw new Error(
        "At least one --seller-id or PUBLIC_STOREFRONT_SELLER_IDS value is required.",
      );
    }

    const configuredValues = configuredSellerIds
      .split(",")
      .map((sellerId) => sellerId.trim());
    if (configuredValues.some((sellerId) => sellerId.length === 0)) {
      throw new Error(
        "PUBLIC_STOREFRONT_SELLER_IDS cannot contain an empty seller ID.",
      );
    }
    sellerIds.push(...configuredValues);
  }
  return { output, sellerIds: validateSellerIds(sellerIds), source };
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

  const resolvedSource = await realpath(sourcePath);
  const configuredLiveReplica = process.env.TURSO_EMBEDDED_REPLICA_URL;
  const configuredLiveReplicaPath =
    configuredLiveReplica &&
    (configuredLiveReplica.startsWith("file:") ||
      !configuredLiveReplica.includes("://"))
      ? normalizeLocalPath(configuredLiveReplica)
      : null;
  const liveReplicaPaths = [
    liveReplicaProductionPath,
    ...(configuredLiveReplicaPath ? [configuredLiveReplicaPath] : []),
  ];

  for (const liveReplicaPath of liveReplicaPaths) {
    const liveReplicaStat = await stat(liveReplicaPath).catch(() => null);
    const resolvedLiveReplica = await realpath(liveReplicaPath).catch(() =>
      path.resolve(liveReplicaPath),
    );
    const isSameFile =
      liveReplicaStat &&
      sourceStat.dev === liveReplicaStat.dev &&
      sourceStat.ino === liveReplicaStat.ino;

    if (resolvedSource !== resolvedLiveReplica && !isSameFile) {
      continue;
    }

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
  let operationError = null;
  try {
    await handle.sync();
  } catch (error) {
    operationError = error;
    throw error;
  } finally {
    try {
      await handle.close();
    } catch (error) {
      if (!operationError) {
        throw error;
      }
      reportHousekeepingWarning(
        `Directory handle close failed: ${getErrorMessage(error)}`,
      );
    }
  }
}

async function writeDurableFile(filePath, contents) {
  const handle = await open(filePath, "wx", 0o644);
  let operationError = null;
  try {
    await handle.writeFile(contents, "utf8");
    await handle.sync();
    return await handle.stat();
  } catch (error) {
    operationError = error;
    throw error;
  } finally {
    try {
      await handle.close();
    } catch (error) {
      if (!operationError) {
        throw error;
      }
      reportHousekeepingWarning(
        `Publication file handle close failed: ${getErrorMessage(error)}`,
      );
    }
  }
}

function isSameFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function parseBuildLock(contents) {
  try {
    const lock = JSON.parse(contents);
    if (
      lock?.formatVersion === 1 &&
      typeof lock.token === "string" &&
      lock.token.length > 0 &&
      typeof lock.pid === "number" &&
      typeof lock.createdAt === "string"
    ) {
      return lock;
    }
  } catch {
    // A stale invalid lock can be quarantined by its file identity.
  }
  return null;
}

async function readLockFile(lockPath) {
  const pathStat = await lstat(lockPath);
  if (!pathStat.isFile()) {
    throw new Error(
      "The storefront artifact build lock is not a regular file.",
    );
  }
  const handle = await open(lockPath, "r");
  let operationError = null;
  try {
    const lockStat = await handle.stat();
    if (!lockStat.isFile() || !isSameFileIdentity(pathStat, lockStat)) {
      throw new Error(
        "The storefront artifact build lock changed while opening.",
      );
    }
    const contents = await handle.readFile("utf8");
    return { contents, lock: parseBuildLock(contents), stat: lockStat };
  } catch (error) {
    operationError = error;
    throw error;
  } finally {
    try {
      await handle.close();
    } catch (error) {
      if (!operationError) {
        throw error;
      }
      reportHousekeepingWarning(
        `Build lock read handle close failed: ${getErrorMessage(error)}`,
      );
    }
  }
}

async function restoreQuarantinedLock(quarantinePath, lockPath) {
  try {
    await link(quarantinePath, lockPath);
  } catch (error) {
    if (!isFileExistsError(error)) {
      throw error;
    }
    return false;
  }

  await unlink(quarantinePath);
  return true;
}

async function quarantineStaleBuildLock(
  outputRoot,
  lockPath,
  staleMilliseconds,
) {
  let observed;
  try {
    observed = await readLockFile(lockPath);
  } catch (error) {
    if (isMissingFileError(error)) {
      return true;
    }
    throw error;
  }

  if (Date.now() - observed.stat.mtimeMs <= staleMilliseconds) {
    throw new Error("A storefront artifact build is already running.");
  }

  const quarantinePath = path.join(
    outputRoot,
    `.build.lock.stale.${observed.lock?.token ?? "invalid"}.${randomUUID()}`,
  );
  try {
    await rename(lockPath, quarantinePath);
  } catch (error) {
    if (isMissingFileError(error)) {
      return true;
    }
    throw error;
  }

  let quarantined;
  try {
    quarantined = await readLockFile(quarantinePath);
  } catch (error) {
    await restoreQuarantinedLock(quarantinePath, lockPath).catch(() => false);
    throw error;
  }

  const stillObservedLock =
    isSameFileIdentity(observed.stat, quarantined.stat) &&
    observed.contents === quarantined.contents;
  const stillStale = Date.now() - quarantined.stat.mtimeMs > staleMilliseconds;
  if (!stillObservedLock || !stillStale) {
    const restored = await restoreQuarantinedLock(quarantinePath, lockPath);
    if (!restored) {
      throw new Error("A storefront artifact build is already running.");
    }
    throw new Error("A storefront artifact build is already running.");
  }

  await unlink(quarantinePath);
  await syncDirectory(outputRoot);
  return true;
}

async function acquireBuildLock(outputRoot, options = {}) {
  const lockPath = path.join(outputRoot, ".build.lock");
  const staleMilliseconds = options.staleMilliseconds ?? staleLockMilliseconds;
  const heartbeatMilliseconds =
    options.heartbeatMilliseconds ??
    Math.max(1, Math.min(60_000, Math.floor(staleMilliseconds / 3)));
  if (
    !Number.isFinite(staleMilliseconds) ||
    staleMilliseconds <= 0 ||
    !Number.isFinite(heartbeatMilliseconds) ||
    heartbeatMilliseconds <= 0 ||
    heartbeatMilliseconds > staleMilliseconds / 3
  ) {
    throw new Error(
      "The build lock heartbeat must be positive and no more than one third of the stale interval.",
    );
  }

  async function acquire() {
    const token = randomUUID();
    let handle;
    let createdStat = null;
    try {
      handle = await open(lockPath, "wx", 0o644);
      createdStat = await handle.stat();
      await handle.writeFile(
        `${JSON.stringify({
          createdAt: new Date().toISOString(),
          formatVersion: 1,
          pid: process.pid,
          token,
        })}\n`,
        "utf8",
      );
      await handle.sync();
      const lockStat = await handle.stat();
      await syncDirectory(outputRoot);
      await options.checkpoint?.("after_build_lock_created", {
        lockPath,
        token,
      });

      let heartbeatTimer = null;
      let heartbeatPromise = Promise.resolve();
      let heartbeatStopped = false;
      let ownershipError = null;

      const assertPathOwnership = async () => {
        let current;
        try {
          current = await readLockFile(lockPath);
        } catch (error) {
          throw new Error(
            `The storefront artifact build lease was lost: ${getErrorMessage(error)}`,
          );
        }
        if (
          !isSameFileIdentity(lockStat, current.stat) ||
          current.lock?.token !== token
        ) {
          throw new Error(
            "The storefront artifact build lease is no longer owned by this process.",
          );
        }
      };

      const assertOwned = async () => {
        if (ownershipError) {
          throw ownershipError;
        }
        await assertPathOwnership();
        if (ownershipError) {
          throw ownershipError;
        }
      };

      const scheduleHeartbeat = () => {
        if (heartbeatStopped) {
          return;
        }
        heartbeatTimer = setTimeout(() => {
          heartbeatPromise = (async () => {
            await assertPathOwnership();
            const heartbeatAt = new Date();
            await handle.utimes(heartbeatAt, heartbeatAt);
            await assertPathOwnership();
          })()
            .catch((error) => {
              ownershipError = error;
              heartbeatStopped = true;
            })
            .finally(() => scheduleHeartbeat());
        }, heartbeatMilliseconds);
        heartbeatTimer.unref();
      };
      scheduleHeartbeat();

      const stopHeartbeat = async () => {
        heartbeatStopped = true;
        if (heartbeatTimer) {
          clearTimeout(heartbeatTimer);
        }
        await heartbeatPromise;
        if (ownershipError) {
          throw ownershipError;
        }
      };

      const release = async () => {
        const releasePath = path.join(
          outputRoot,
          `.build.lock.release.${token}.${randomUUID()}`,
        );
        let releaseError = null;
        try {
          await stopHeartbeat();
          await assertPathOwnership();
          await rename(lockPath, releasePath);
          const released = await readLockFile(releasePath);
          if (
            !isSameFileIdentity(lockStat, released.stat) ||
            released.lock?.token !== token
          ) {
            await restoreQuarantinedLock(releasePath, lockPath);
            throw new Error(
              "The storefront artifact build lock changed during release.",
            );
          }
          await unlink(releasePath);
          await syncDirectory(outputRoot);
        } catch (error) {
          releaseError = error;
        } finally {
          try {
            await handle.close();
          } catch (error) {
            if (!releaseError) {
              releaseError = error;
            } else {
              reportHousekeepingWarning(
                `Build lock handle close failed: ${getErrorMessage(error)}`,
              );
            }
          }
        }
        if (releaseError) {
          throw releaseError;
        }
      };

      return {
        assertOwned,
        release,
        staleMilliseconds,
        token,
      };
    } catch (error) {
      if (handle) {
        await handle.close().catch((closeError) => {
          reportHousekeepingWarning(
            `Incomplete build lock handle close failed: ${getErrorMessage(closeError)}`,
          );
        });
        try {
          const currentStat = await lstat(lockPath).catch((cleanupError) => {
            if (isMissingFileError(cleanupError)) {
              return null;
            }
            throw cleanupError;
          });
          if (
            createdStat &&
            currentStat?.isFile() &&
            isSameFileIdentity(createdStat, currentStat)
          ) {
            await unlink(lockPath);
            await syncDirectory(outputRoot);
          }
        } catch (cleanupError) {
          reportHousekeepingWarning(
            `Incomplete build lock cleanup failed: ${getErrorMessage(cleanupError)}`,
          );
        }
        throw error;
      }
      if (!isFileExistsError(error)) {
        throw error;
      }
      await quarantineStaleBuildLock(outputRoot, lockPath, staleMilliseconds);
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

async function validatePublishedArtifact(artifactPath, sellerId, metadata) {
  const existingStat = await lstat(artifactPath).catch((error) => {
    if (isMissingFileError(error)) {
      return null;
    }
    throw error;
  });
  if (!existingStat) {
    return false;
  }
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
  return true;
}

async function removeTrackedTemporaryFile(entry, buildLock) {
  await buildLock.assertOwned();
  const currentStat = await lstat(entry.path).catch((error) => {
    if (isMissingFileError(error)) {
      return null;
    }
    throw error;
  });
  if (!currentStat) {
    return;
  }
  if (!currentStat.isFile() || !isSameFileIdentity(entry.stat, currentStat)) {
    throw new Error(`A publication temporary file changed: ${entry.path}`);
  }
  await unlink(entry.path).catch((error) => {
    if (!isMissingFileError(error)) {
      throw error;
    }
  });
}

async function unlinkUnchangedRegularFile(filePath, observedStat, buildLock) {
  await buildLock.assertOwned();
  const currentStat = await lstat(filePath).catch((error) => {
    if (isMissingFileError(error)) {
      return null;
    }
    throw error;
  });
  if (
    !currentStat?.isFile() ||
    !isSameFileIdentity(observedStat, currentStat)
  ) {
    return false;
  }

  try {
    await unlink(filePath);
    return true;
  } catch (error) {
    if (isMissingFileError(error)) {
      return false;
    }
    throw error;
  }
}

async function publishArtifact(
  artifactDirectory,
  sellerId,
  body,
  metadata,
  buildLock,
  publicationJournal,
  temporaryFiles,
  checkpoint,
) {
  await buildLock.assertOwned();
  const artifactPath = path.join(artifactDirectory, metadata.artifact);
  if (await validatePublishedArtifact(artifactPath, sellerId, metadata)) {
    return;
  }

  const temporaryPath = path.join(
    artifactDirectory,
    `.${metadata.artifact}.artifact.${buildLock.token}.${randomUUID()}.tmp`,
  );
  let temporaryEntry = null;
  let publicationError = null;
  try {
    const temporaryStat = await writeDurableFile(temporaryPath, body);
    temporaryEntry = { path: temporaryPath, stat: temporaryStat };
    temporaryFiles.set(temporaryPath, temporaryEntry);
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

    await checkpoint("before_artifact_install", {
      artifact: metadata.artifact,
      artifactPath,
      sellerId,
    });
    await buildLock.assertOwned();
    try {
      await link(temporaryPath, artifactPath);
      publicationJournal.push({ path: artifactPath, stat: temporaryStat });
    } catch (error) {
      if (!isFileExistsError(error)) {
        throw error;
      }
      if (
        !(await validatePublishedArtifact(artifactPath, sellerId, metadata))
      ) {
        throw new Error(
          `The concurrent content-addressed artifact disappeared: ${metadata.artifact}`,
        );
      }
    }
    await syncDirectory(artifactDirectory);
  } catch (error) {
    publicationError = error;
    throw error;
  } finally {
    if (temporaryEntry) {
      try {
        await removeTrackedTemporaryFile(temporaryEntry, buildLock);
        temporaryFiles.delete(temporaryPath);
      } catch (error) {
        if (publicationError) {
          reportHousekeepingWarning(
            `Temporary artifact cleanup failed: ${getErrorMessage(error)}`,
          );
        } else {
          throw error;
        }
      }
    }
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

async function refreshRetentionClock(
  artifactDirectory,
  artifactNames,
  buildLock,
) {
  if (!artifactNames) {
    return;
  }

  const retainedAt = new Date();
  for (const artifactName of artifactNames) {
    await buildLock.assertOwned();
    const artifactPath = path.join(artifactDirectory, artifactName);
    const artifactStat = await lstat(artifactPath).catch((error) => {
      if (!isMissingFileError(error)) {
        throw error;
      }
      return null;
    });
    if (!artifactStat) {
      continue;
    }
    if (!artifactStat.isFile()) {
      throw new Error(
        `A retained storefront artifact is not a file: ${artifactName}`,
      );
    }
    await buildLock.assertOwned();
    const currentStat = await lstat(artifactPath).catch((error) => {
      if (isMissingFileError(error)) {
        return null;
      }
      throw error;
    });
    if (
      currentStat?.isFile() &&
      isSameFileIdentity(artifactStat, currentStat)
    ) {
      await utimes(artifactPath, retainedAt, retainedAt).catch((error) => {
        if (!isMissingFileError(error)) {
          throw error;
        }
      });
    }
  }
}

async function publishManifest(
  currentDirectory,
  manifest,
  buildLock,
  temporaryFiles,
  checkpoint,
) {
  const manifestPath = path.join(currentDirectory, "manifest.json");
  const temporaryPath = path.join(
    currentDirectory,
    `.manifest.${buildLock.token}.${randomUUID()}.tmp`,
  );
  const previousManifestPath = path.join(
    currentDirectory,
    `.manifest.${buildLock.token}.${randomUUID()}.tmp`,
  );
  const contents = `${JSON.stringify(manifest)}\n`;
  let temporaryEntry = null;
  let previousManifestEntry = null;
  let manifestInstalled = false;
  let manifestDurable = false;

  try {
    const previousManifestStat = await lstat(manifestPath).catch((error) => {
      if (isMissingFileError(error)) {
        return null;
      }
      throw error;
    });
    if (previousManifestStat) {
      if (!previousManifestStat.isFile()) {
        throw new Error("The current storefront manifest is not a file.");
      }
      await buildLock.assertOwned();
      await link(manifestPath, previousManifestPath);
      const linkedManifestStat = await lstat(previousManifestPath);
      if (!isSameFileIdentity(previousManifestStat, linkedManifestStat)) {
        throw new Error(
          "The current storefront manifest changed during backup.",
        );
      }
      previousManifestEntry = {
        path: previousManifestPath,
        stat: linkedManifestStat,
      };
      temporaryFiles.set(previousManifestPath, previousManifestEntry);
      await syncDirectory(currentDirectory);
    }

    const temporaryStat = await writeDurableFile(temporaryPath, contents);
    temporaryEntry = { path: temporaryPath, stat: temporaryStat };
    temporaryFiles.set(temporaryPath, temporaryEntry);
    const parsedManifest = JSON.parse(await readFile(temporaryPath, "utf8"));
    if (
      parsedManifest.formatVersion !== manifestFormatVersion ||
      !Array.isArray(parsedManifest.sellers) ||
      parsedManifest.sellers.length !== manifest.sellers.length
    ) {
      throw new Error("The temporary storefront manifest failed validation.");
    }
    await checkpoint("before_manifest_commit", {
      manifestPath,
      temporaryPath,
    });
    await buildLock.assertOwned();
    await rename(temporaryPath, manifestPath);
    manifestInstalled = true;
    temporaryFiles.delete(temporaryPath);
    await checkpoint("after_manifest_rename_before_sync", { manifestPath });
    await syncDirectory(currentDirectory);
    manifestDurable = true;
    return previousManifestEntry;
  } catch (error) {
    if (manifestInstalled && !manifestDurable && temporaryEntry) {
      try {
        await buildLock.assertOwned();
        const currentManifestStat = await lstat(manifestPath);
        if (
          !currentManifestStat.isFile() ||
          !isSameFileIdentity(temporaryEntry.stat, currentManifestStat)
        ) {
          throw new Error(
            "The installed storefront manifest changed before rollback.",
          );
        }

        if (previousManifestEntry) {
          const currentPreviousStat = await lstat(previousManifestEntry.path);
          if (
            !currentPreviousStat.isFile() ||
            !isSameFileIdentity(previousManifestEntry.stat, currentPreviousStat)
          ) {
            throw new Error(
              "The previous storefront manifest changed before rollback.",
            );
          }
          await rename(previousManifestEntry.path, manifestPath);
          temporaryFiles.delete(previousManifestEntry.path);
        } else {
          await unlink(manifestPath);
        }
        await syncDirectory(currentDirectory);
      } catch (rollbackError) {
        reportHousekeepingWarning(
          `Manifest rollback failed: ${getErrorMessage(rollbackError)}`,
        );
      }
    }

    if (temporaryEntry) {
      try {
        await removeTrackedTemporaryFile(temporaryEntry, buildLock);
        temporaryFiles.delete(temporaryPath);
      } catch (cleanupError) {
        reportHousekeepingWarning(
          `Temporary manifest cleanup failed: ${getErrorMessage(cleanupError)}`,
        );
      }
    }
    throw error;
  }
}

async function removeExpiredArtifacts(
  artifactDirectory,
  referencedArtifacts,
  buildLock,
) {
  const retentionCutoff = Date.now() - artifactRetentionMilliseconds;
  let removedCount = 0;

  for (const directoryEntry of await readdir(artifactDirectory, {
    withFileTypes: true,
  })) {
    if (
      !artifactFilePattern.test(directoryEntry.name) ||
      referencedArtifacts.has(directoryEntry.name)
    ) {
      continue;
    }

    const artifactPath = path.join(artifactDirectory, directoryEntry.name);
    const artifactStat = await lstat(artifactPath);
    if (!artifactStat.isFile() || artifactStat.mtimeMs >= retentionCutoff) {
      continue;
    }

    if (
      await unlinkUnchangedRegularFile(artifactPath, artifactStat, buildLock)
    ) {
      removedCount += 1;
    }
  }

  if (removedCount > 0) {
    await syncDirectory(artifactDirectory);
  }
  return removedCount;
}

async function sweepStaleFilesInDirectory(
  directoryPath,
  matchesName,
  cutoff,
  buildLock,
) {
  let removedCount = 0;
  for (const directoryEntry of await readdir(directoryPath, {
    withFileTypes: true,
  })) {
    if (!matchesName(directoryEntry.name)) {
      continue;
    }
    const entryPath = path.join(directoryPath, directoryEntry.name);
    const entryStat = await lstat(entryPath);
    if (!entryStat.isFile() || entryStat.mtimeMs >= cutoff) {
      continue;
    }
    if (await unlinkUnchangedRegularFile(entryPath, entryStat, buildLock)) {
      removedCount += 1;
    }
  }
  if (removedCount > 0) {
    await syncDirectory(directoryPath);
  }
  return removedCount;
}

async function sweepStalePublicationFiles(
  outputRoot,
  artifactDirectory,
  currentDirectory,
  buildLock,
) {
  const staleCutoff = Date.now() - buildLock.staleMilliseconds;
  await sweepStaleFilesInDirectory(
    artifactDirectory,
    (name) => artifactTemporaryFilePattern.test(name),
    staleCutoff,
    buildLock,
  );
  await sweepStaleFilesInDirectory(
    currentDirectory,
    (name) => manifestTemporaryFilePattern.test(name),
    staleCutoff,
    buildLock,
  );
  await sweepStaleFilesInDirectory(
    outputRoot,
    (name) => abandonedLockFilePattern.test(name),
    staleCutoff,
    buildLock,
  );
}

async function rollbackPrecommitPublication(
  artifactDirectory,
  currentDirectory,
  publicationJournal,
  temporaryFiles,
  buildLock,
) {
  await buildLock.assertOwned();
  for (const entry of [...temporaryFiles.values()]) {
    await removeTrackedTemporaryFile(entry, buildLock);
    temporaryFiles.delete(entry.path);
  }

  const currentReferences =
    await getPreviouslyReferencedArtifacts(currentDirectory);
  if (!currentReferences) {
    throw new Error(
      "The current storefront manifest is invalid, so new artifacts cannot be removed safely.",
    );
  }

  let artifactDirectoryChanged = false;
  for (const entry of publicationJournal) {
    await buildLock.assertOwned();
    if (currentReferences.has(path.basename(entry.path))) {
      continue;
    }
    const currentStat = await lstat(entry.path).catch((error) => {
      if (isMissingFileError(error)) {
        return null;
      }
      throw error;
    });
    if (
      !currentStat ||
      !currentStat.isFile() ||
      !isSameFileIdentity(entry.stat, currentStat)
    ) {
      continue;
    }
    if (await unlinkUnchangedRegularFile(entry.path, currentStat, buildLock)) {
      artifactDirectoryChanged = true;
    }
  }
  if (artifactDirectoryChanged) {
    await syncDirectory(artifactDirectory);
  }
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function reportHousekeepingWarning(message) {
  try {
    process.stderr.write(`${JSON.stringify({ level: "warning", message })}\n`);
  } catch {
    // A warning channel failure must not change publication status.
  }
}

async function runRecoverableHousekeeping(
  label,
  operation,
  warnings,
  executeOperation,
) {
  try {
    return await executeOperation(label, operation);
  } catch (error) {
    const warning = `${label}: ${getErrorMessage(error)}`;
    warnings.push(warning);
    reportHousekeepingWarning(warning);
    return null;
  }
}

export async function buildPublicStorefrontArtifacts(
  options,
  dependencies = {},
) {
  const sellerIds = validateSellerIds(options.sellerIds);
  const executeHousekeepingOperation =
    dependencies.executeHousekeepingOperation ??
    ((_label, operation) => operation());
  const checkpoint = dependencies.checkpoint ?? (async () => undefined);
  const createDatabase =
    dependencies.createDatabase ??
    (async (sourcePath) => {
      const adapter = new PrismaBetterSqlite3(
        { url: `file:${sourcePath}` },
        { timestampFormat: "unixepoch-ms" },
      );
      return new PrismaClient({ adapter, log: ["error"] });
    });
  const getSnapshot = dependencies.getSnapshot ?? getPublicStorefrontSnapshot;
  const sourcePath = normalizeLocalPath(options.source);
  const outputRoot = path.resolve(appRoot, options.output);
  await assertSafeSource(sourcePath);
  await mkdir(outputRoot, { recursive: true });
  const artifactDirectory = path.join(outputRoot, "artifacts");
  const currentDirectory = path.join(outputRoot, "current");
  await mkdir(artifactDirectory, { recursive: true });
  await mkdir(currentDirectory, { recursive: true });
  const buildLock = await acquireBuildLock(outputRoot, {
    ...dependencies.lockOptions,
    checkpoint,
  });
  let database = null;
  let buildError = null;
  let manifestCommitted = false;
  let result = null;
  const generatedAt = new Date().toISOString();
  const sellers = [];
  const warnings = [];
  const publicationJournal = [];
  const temporaryFiles = new Map();

  try {
    database = await createDatabase(sourcePath);
    await database.$queryRawUnsafe("PRAGMA query_only = ON");
    const previouslyReferencedArtifacts =
      await getPreviouslyReferencedArtifacts(currentDirectory);

    for (const sellerId of sellerIds) {
      const snapshot = await getSnapshot(database, sellerId, generatedAt);
      if (!snapshot) {
        throw new Error(
          `Configured storefront seller was not found: ${sellerId}`,
        );
      }

      const body = JSON.stringify(snapshot);
      const metadata = getRepresentationMetadata(body, sellerId);
      await publishArtifact(
        artifactDirectory,
        sellerId,
        body,
        metadata,
        buildLock,
        publicationJournal,
        temporaryFiles,
        checkpoint,
      );
      sellers.push({ id: sellerId, ...metadata });
    }

    const manifest = {
      formatVersion: manifestFormatVersion,
      generatedAt,
      sellers,
    };
    const successResult = {
      generatedAt,
      outputRoot,
      ready: true,
      removedArtifacts: null,
      sellers: sellers.map((seller) => ({
        id: seller.id,
        artifact: seller.artifact,
        byteLength: seller.byteLength,
      })),
      warnings,
    };
    await refreshRetentionClock(
      artifactDirectory,
      previouslyReferencedArtifacts,
      buildLock,
    );
    const previousManifestEntry = await publishManifest(
      currentDirectory,
      manifest,
      buildLock,
      temporaryFiles,
      checkpoint,
    );
    manifestCommitted = true;
    result = successResult;
    if (previousManifestEntry) {
      await runRecoverableHousekeeping(
        "Previous manifest cleanup failed",
        async () => {
          await removeTrackedTemporaryFile(previousManifestEntry, buildLock);
          temporaryFiles.delete(previousManifestEntry.path);
          await syncDirectory(currentDirectory);
        },
        warnings,
        executeHousekeepingOperation,
      );
    }
    const removedArtifacts = previouslyReferencedArtifacts
      ? await runRecoverableHousekeeping(
          "Artifact retention cleanup failed",
          () =>
            removeExpiredArtifacts(
              artifactDirectory,
              new Set(sellers.map((seller) => seller.artifact)),
              buildLock,
            ),
          warnings,
          executeHousekeepingOperation,
        )
      : null;
    successResult.removedArtifacts = removedArtifacts;
    await runRecoverableHousekeeping(
      "Stale publication cleanup failed",
      () =>
        sweepStalePublicationFiles(
          outputRoot,
          artifactDirectory,
          currentDirectory,
          buildLock,
        ),
      warnings,
      executeHousekeepingOperation,
    );
  } catch (error) {
    if (manifestCommitted) {
      await runRecoverableHousekeeping(
        "Post-publication finalization failed",
        () => Promise.reject(error),
        warnings,
        executeHousekeepingOperation,
      );
    } else {
      buildError = error;
      try {
        await rollbackPrecommitPublication(
          artifactDirectory,
          currentDirectory,
          publicationJournal,
          temporaryFiles,
          buildLock,
        );
      } catch (cleanupError) {
        reportHousekeepingWarning(
          `Pre-publication rollback failed: ${getErrorMessage(cleanupError)}`,
        );
      }
    }
  } finally {
    const resourceCleanup = [
      ...(database
        ? [
            {
              label: "Prisma disconnect failed",
              operation: () => database.$disconnect(),
            },
          ]
        : []),
      {
        label: "Build lock release failed",
        operation: buildLock.release,
      },
    ];

    for (const { label, operation } of resourceCleanup) {
      if (manifestCommitted) {
        await runRecoverableHousekeeping(
          label,
          operation,
          warnings,
          executeHousekeepingOperation,
        );
        continue;
      }

      try {
        await operation();
      } catch (error) {
        if (!buildError) {
          buildError = error;
        } else {
          reportHousekeepingWarning(`${label}: ${getErrorMessage(error)}`);
        }
      }
    }
  }

  if (buildError) {
    throw buildError;
  }
  if (!result) {
    throw new Error("The storefront artifact build did not produce a result.");
  }

  return result;
}

export async function main(args = process.argv.slice(2), dependencies = {}) {
  const result = await buildPublicStorefrontArtifacts(
    parseArgs(args),
    dependencies,
  );
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
