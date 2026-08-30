#!/usr/bin/env node
// @ts-nocheck -- Directly executable artifact publisher, contract-tested by Vitest.

import { createHash, randomUUID } from "node:crypto";
import {
  link,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  unlink,
  utimes,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { streamToTargetWorker } from "../src/server/target-worker-stream.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultTargetWorkerPath = path.join(
  scriptDirectory,
  "build-public-storefront-artifacts-target.mjs",
);
const manifestFormatVersion = 1;
const sourceListingBatchSize = 200;
const sourceReadTransactionTimeoutMilliseconds = 5 * 60 * 1_000;
const artifactRetentionMilliseconds = 7 * 24 * 60 * 60 * 1_000;
// The scheduled retry starts after 15 minutes. It must be able to quarantine a
// lease left by a watchdog kill, while a live build refreshes the lease each minute.
const staleLockMilliseconds = 5 * 60 * 1_000;
const artifactFilePattern = /^[a-f0-9]{64}\.json$/;
const artifactTemporaryFilePattern =
  /^\.[a-f0-9]{64}\.json\.artifact\.[a-f0-9-]+\.[a-f0-9-]+\.tmp$/;
const manifestTemporaryFilePattern =
  /^\.manifest\.[a-f0-9-]+\.[a-f0-9-]+\.tmp$/;
const abandonedLockFilePattern = /^\.build\.lock\.(stale|release)\./;
const reservedPublicListSlugs = new Set(["all", "for-sale", "search"]);
const unsafePublicListSlugPattern = /[/?#%]/;

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

export async function publishPublicStorefrontArtifacts(
  options,
  dependencies = {},
) {
  const sellerIds = validateSellerIds(options.sellerIds);
  if (
    typeof options.output !== "string" ||
    options.output.trim().length === 0
  ) {
    throw new Error("The storefront artifact output path is required.");
  }
  if (typeof dependencies.getSnapshot !== "function") {
    throw new Error("A storefront snapshot reader is required.");
  }

  const executeHousekeepingOperation =
    dependencies.executeHousekeepingOperation ??
    ((_label, operation) => operation());
  const checkpoint = dependencies.checkpoint ?? (async () => undefined);
  const getSnapshot = dependencies.getSnapshot;
  const validateSnapshot =
    dependencies.validateSnapshot ?? ((snapshot) => snapshot);
  const outputRoot = path.resolve(options.output);
  await mkdir(outputRoot, { recursive: true });
  const artifactDirectory = path.join(outputRoot, "artifacts");
  const currentDirectory = path.join(outputRoot, "current");
  await mkdir(artifactDirectory, { recursive: true });
  await mkdir(currentDirectory, { recursive: true });
  const buildLock = await acquireBuildLock(outputRoot, {
    ...dependencies.lockOptions,
    checkpoint,
  });
  let buildError = null;
  let manifestCommitted = false;
  let result = null;
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const sellers = [];
  const warnings = [];
  const publicationJournal = [];
  const temporaryFiles = new Map();

  try {
    const previouslyReferencedArtifacts =
      await getPreviouslyReferencedArtifacts(currentDirectory);

    for (const sellerId of sellerIds) {
      const snapshot = await getSnapshot(sellerId, generatedAt);
      if (!snapshot) {
        throw new Error(
          `Configured storefront seller was not found: ${sellerId}`,
        );
      }

      const validatedSnapshot = await validateSnapshot(snapshot);
      const body = JSON.stringify(validatedSnapshot);
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
    if (manifestCommitted) {
      await runRecoverableHousekeeping(
        "Build lock release failed",
        buildLock.release,
        warnings,
        executeHousekeepingOperation,
      );
    } else {
      try {
        await buildLock.release();
      } catch (error) {
        if (!buildError) {
          buildError = error;
        } else {
          reportHousekeepingWarning(
            `Build lock release failed: ${getErrorMessage(error)}`,
          );
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

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getPublicListSlug(title) {
  return title.toLowerCase().replace(/\s+/g, "-");
}

function assertSafePublicSlug(slug, label, sellerId) {
  if (
    typeof slug !== "string" ||
    slug.length === 0 ||
    slug === "." ||
    slug === ".." ||
    unsafePublicListSlugPattern.test(slug)
  ) {
    throw new Error(
      `Unsafe public ${label} slug "${String(slug)}" for seller "${sellerId}".`,
    );
  }
  if (reservedPublicListSlugs.has(slug)) {
    throw new Error(
      `Reserved public ${label} slug "${slug}" for seller "${sellerId}".`,
    );
  }
}

function validatePublicLists(lists, sellerId) {
  if (!Array.isArray(lists)) {
    throw new Error(`Public lists are invalid for seller "${sellerId}".`);
  }

  const listIds = new Set();
  const listIdBySlug = new Map();
  return lists.map((list) => {
    if (
      !isRecord(list) ||
      typeof list.id !== "string" ||
      list.id.length === 0 ||
      typeof list.title !== "string"
    ) {
      throw new Error(`A public list is invalid for seller "${sellerId}".`);
    }
    if (listIds.has(list.id)) {
      throw new Error(
        `Duplicate public list ID "${list.id}" for seller "${sellerId}".`,
      );
    }

    const expectedSlug = getPublicListSlug(list.title);
    if (list.slug !== expectedSlug) {
      throw new Error(
        `Invalid public list slug "${String(list.slug)}" for seller "${sellerId}". Expected "${expectedSlug}".`,
      );
    }
    assertSafePublicSlug(expectedSlug, "list", sellerId);

    const existingListId = listIdBySlug.get(expectedSlug);
    if (existingListId) {
      throw new Error(
        `Duplicate public list slug "${expectedSlug}" for seller "${sellerId}". Lists "${existingListId}" and "${list.id}" generate the same slug.`,
      );
    }

    listIds.add(list.id);
    listIdBySlug.set(expectedSlug, list.id);
    return { ...list, listingIds: [] };
  });
}

async function* readNdjsonLines(input) {
  input.setEncoding("utf8");
  let buffered = "";

  for await (const chunk of input) {
    buffered += String(chunk);
    let lineEnd = buffered.indexOf("\n");
    while (lineEnd >= 0) {
      yield buffered.slice(0, lineEnd);
      buffered = buffered.slice(lineEnd + 1);
      lineEnd = buffered.indexOf("\n");
    }
  }

  if (buffered) yield buffered;
}

async function readProtocolMessage(reader, expectedType) {
  const next = await reader.next();
  if (next.done) {
    throw new Error(
      `Storefront source ended before the ${expectedType} message.`,
    );
  }
  if (!next.value.trim()) {
    throw new Error("Storefront source sent an empty protocol message.");
  }

  let message;
  try {
    message = JSON.parse(next.value);
  } catch {
    throw new Error("Storefront source sent invalid JSON.");
  }
  if (!isRecord(message) || message.type !== expectedType) {
    throw new Error(
      `Expected storefront source message ${expectedType}, received ${isRecord(message) ? String(message.type) : "invalid"}.`,
    );
  }
  return message;
}

function validateSourceCompletion(message, sellerResults) {
  const sourceResult = message.sourceResult;
  if (!isRecord(sourceResult) || !Array.isArray(sourceResult.sellers)) {
    throw new Error("The storefront source completion result is invalid.");
  }
  if (sourceResult.sellers.length !== sellerResults.length) {
    throw new Error("The storefront source seller count changed during build.");
  }

  for (const [index, expected] of sellerResults.entries()) {
    const actual = sourceResult.sellers[index];
    if (
      !isRecord(actual) ||
      actual.id !== expected.id ||
      actual.listingCount !== expected.listingCount
    ) {
      throw new Error(
        `The storefront source result does not match seller "${expected.id}".`,
      );
    }
  }
}

async function readPublicStorefrontSnapshot({
  generatedAt,
  isLastSeller,
  reader,
  sellerId,
  sellerResults,
}) {
  const start = await readProtocolMessage(reader, "seller_start");
  if (
    start.sellerId !== sellerId ||
    !isRecord(start.seller) ||
    start.seller.id !== sellerId
  ) {
    throw new Error(
      `The storefront source seller does not match "${sellerId}".`,
    );
  }

  const lists = validatePublicLists(start.lists, sellerId);
  const listById = new Map(lists.map((list) => [list.id, list]));
  const listings = [];
  const listingIds = new Set();
  const listingIdBySlug = new Map();

  while (true) {
    const next = await reader.next();
    if (next.done) {
      throw new Error(
        `Storefront source ended before seller "${sellerId}" was complete.`,
      );
    }

    let message;
    try {
      message = JSON.parse(next.value);
    } catch {
      throw new Error("Storefront source sent invalid JSON.");
    }
    if (!isRecord(message) || message.sellerId !== sellerId) {
      throw new Error(`The storefront source changed seller "${sellerId}".`);
    }
    if (message.type === "seller_complete") {
      if (message.listingCount !== listings.length) {
        throw new Error(
          `The storefront listing count changed for seller "${sellerId}".`,
        );
      }
      sellerResults.push({ id: sellerId, listingCount: listings.length });
      break;
    }
    if (
      message.type !== "listing_page" ||
      !Array.isArray(message.items) ||
      message.items.length === 0 ||
      message.items.length > sourceListingBatchSize
    ) {
      throw new Error(
        `Invalid storefront listing page for seller "${sellerId}".`,
      );
    }

    for (const item of message.items) {
      if (
        !isRecord(item) ||
        !isRecord(item.listing) ||
        typeof item.listing.id !== "string" ||
        item.listing.id.length === 0 ||
        !Array.isArray(item.listIds)
      ) {
        throw new Error(`Invalid public listing for seller "${sellerId}".`);
      }
      if (listingIds.has(item.listing.id)) {
        throw new Error(
          `Duplicate public listing ID "${item.listing.id}" for seller "${sellerId}".`,
        );
      }
      assertSafePublicSlug(item.listing.slug, "listing", sellerId);
      const existingListingId = listingIdBySlug.get(item.listing.slug);
      if (existingListingId) {
        throw new Error(
          `Duplicate public listing slug "${item.listing.slug}" for seller "${sellerId}". Listings "${existingListingId}" and "${item.listing.id}" use the same slug.`,
        );
      }

      const uniqueListIds = new Set();
      for (const listId of item.listIds) {
        if (typeof listId !== "string" || !listById.has(listId)) {
          throw new Error(
            `Listing "${item.listing.id}" references an unknown public list for seller "${sellerId}".`,
          );
        }
        if (uniqueListIds.has(listId)) {
          throw new Error(
            `Listing "${item.listing.id}" repeats public list "${listId}" for seller "${sellerId}".`,
          );
        }
        uniqueListIds.add(listId);
        listById.get(listId).listingIds.push(item.listing.id);
      }

      listingIds.add(item.listing.id);
      listingIdBySlug.set(item.listing.slug, item.listing.id);
      listings.push(item.listing);
    }
  }

  if (isLastSeller) {
    const completion = await readProtocolMessage(reader, "complete");
    validateSourceCompletion(completion, sellerResults);
    if (!(await reader.next()).done) {
      throw new Error("Storefront source sent data after completion.");
    }
  }

  return {
    version: 1,
    generatedAt,
    seller: start.seller,
    lists,
    listings,
  };
}

export async function runPublicStorefrontArtifactsTargetWorker(
  { input, output, sellerIds },
  dependencies = {},
) {
  const normalizedSellerIds = validateSellerIds(sellerIds);
  const reader = readNdjsonLines(input)[Symbol.asyncIterator]();
  const sellerResults = [];
  let sellerIndex = 0;

  try {
    return await publishPublicStorefrontArtifacts(
      { output, sellerIds: normalizedSellerIds },
      {
        ...dependencies,
        getSnapshot: async (sellerId, generatedAt) => {
          if (sellerId !== normalizedSellerIds[sellerIndex]) {
            throw new Error(
              "Storefront publication requested sellers out of order.",
            );
          }
          const snapshot = await readPublicStorefrontSnapshot({
            generatedAt,
            isLastSeller: sellerIndex === normalizedSellerIds.length - 1,
            reader,
            sellerId,
            sellerResults,
          });
          sellerIndex += 1;
          return snapshot;
        },
      },
    );
  } finally {
    input.destroy?.();
    try {
      await reader.return?.();
    } catch (error) {
      reportHousekeepingWarning(
        `Storefront source stream cleanup failed: ${getErrorMessage(error)}`,
      );
    }
  }
}

function validateTargetResult(targetResult, sourceResult, outputRoot) {
  if (
    !isRecord(targetResult) ||
    targetResult.ready !== true ||
    targetResult.outputRoot !== outputRoot ||
    !Array.isArray(targetResult.sellers) ||
    targetResult.sellers.length !== sourceResult.sellers.length
  ) {
    throw new Error("The storefront target worker returned an invalid result.");
  }

  for (const [index, sourceSeller] of sourceResult.sellers.entries()) {
    const targetSeller = targetResult.sellers[index];
    if (!isRecord(targetSeller) || targetSeller.id !== sourceSeller.id) {
      throw new Error(
        `The storefront target result does not match seller "${sourceSeller.id}".`,
      );
    }
  }
}

/**
 * Stream bounded public projections from an already-synced Prisma replica to
 * the target-only publication worker.
 *
 * @param {{
 *   output: string,
 *   sellerIds: string[],
 *   sourceDb: import("@prisma/client").PrismaClient,
 *   targetWorkerLifecycle?: {
 *     onWorkerStarted: (pid: number) => Promise<void> | void,
 *     onWorkerStopped: (pid: number) => Promise<void> | void,
 *   },
 *   targetWorkerPath?: string,
 * }} options
 */
export async function buildPublicStorefrontArtifacts({
  output,
  sellerIds,
  sourceDb,
  targetWorkerLifecycle,
  targetWorkerPath = defaultTargetWorkerPath,
}) {
  const normalizedSellerIds = validateSellerIds(sellerIds);
  if (!sourceDb)
    throw new Error("A synced storefront source database is required.");
  if (typeof output !== "string" || output.trim().length === 0) {
    throw new Error("The storefront artifact output path is required.");
  }
  if (
    typeof targetWorkerPath !== "string" ||
    targetWorkerPath.trim().length === 0 ||
    !path.isAbsolute(targetWorkerPath)
  ) {
    throw new Error("The storefront target worker path must be absolute.");
  }

  const outputRoot = path.resolve(output);
  if (typeof sourceDb.$transaction !== "function") {
    throw new Error(
      "The synced storefront source database must support transactions.",
    );
  }
  const { streamPublicStorefrontSource } = await import(
    "./storefront/public-storefront-data.mjs"
  );
  const { sourceResult, targetResult } = await streamToTargetWorker({
    targetWorkerArgs: [
      "--output",
      outputRoot,
      ...normalizedSellerIds.flatMap((sellerId) => ["--seller-id", sellerId]),
    ],
    targetWorkerLifecycle,
    targetWorkerPath,
    stream: (write) =>
      sourceDb.$transaction(
        (transaction) =>
          streamPublicStorefrontSource({
            database: transaction,
            sellerIds: normalizedSellerIds,
            write,
          }),
        { timeout: sourceReadTransactionTimeoutMilliseconds },
      ),
  });

  validateTargetResult(targetResult, sourceResult, outputRoot);
  return targetResult;
}
