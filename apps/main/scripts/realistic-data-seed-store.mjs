import {
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip, gzipSync } from "node:zlib";

import { realisticDataSchemaFingerprint } from "./realistic-data-snapshot.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const seedDirectory = path.join(appRoot, "local", "realistic-data");
export const seedPaths = {
  database: path.join(seedDirectory, "realistic-data.sqlite"),
  manifest: path.join(seedDirectory, "personas.json"),
  searchIndex: path.join(
    appRoot,
    ".tmp",
    "search",
    "public-search-candidate.sqlite",
  ),
  schema: path.join(appRoot, "prisma", "schema.prisma"),
};

const R2_ENDPOINT =
  "https://862f016642ad509483b546d81fc48f63.r2.cloudflarestorage.com";
const BUCKET = "daylily-catalog-dev";
const LATEST_KEY = "realistic-seed/latest.json";
const seedKey = (fingerprint, name) => `realistic-seed/${fingerprint}/${name}`;

function r2Client() {
  const accessKeyId = process.env.SEED_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SEED_R2_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Set SEED_R2_ACCESS_KEY_ID and SEED_R2_SECRET_ACCESS_KEY from 1Password. See AGENTS.md.",
    );
  }
  return new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/** @param {string} filePath */
function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

/**
 * Bring a local seed database to the current schema, build its search index,
 * and record it as the local seed.
 * @param {Record<string, unknown>} details
 */
export function finishLocalSeed(details) {
  execFileSync(
    path.join(appRoot, "node_modules", ".bin", "prisma"),
    ["db", "push", "--accept-data-loss", "--url", `file:${seedPaths.database}`],
    { cwd: appRoot, env: process.env, stdio: "inherit" },
  );
  execFileSync(
    process.execPath,
    [
      path.join(appRoot, "scripts", "build-public-search-index.mjs"),
      "--source",
      seedPaths.database,
      "--target",
      seedPaths.searchIndex,
    ],
    {
      cwd: appRoot,
      env: { ...process.env, NODE_ENV: "development" },
      stdio: "inherit",
    },
  );
  const manifest = {
    ...details,
    databasePath: seedPaths.database,
    searchIndexPath: seedPaths.searchIndex,
    schemaFingerprint: realisticDataSchemaFingerprint(seedPaths.schema),
  };
  mkdirSync(seedDirectory, { recursive: true });
  writeFileSync(seedPaths.manifest, `${JSON.stringify(manifest, null, 2)}\n`, {
    mode: 0o600,
  });
  return manifest;
}

/** Upload the local seed database. Other checkouts download it. */
export async function publishRealisticDataSeed() {
  const local = JSON.parse(readFileSync(seedPaths.manifest, "utf8"));
  const client = r2Client();
  const { databasePath: _db, searchIndexPath: _search, ...details } = local;
  const remote = {
    ...details,
    key: seedKey(local.schemaFingerprint, "realistic-data.sqlite.gz"),
    sha256: sha256File(seedPaths.database),
  };
  const body = gzipSync(readFileSync(seedPaths.database));
  await client.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: remote.key, Body: body }),
  );
  const manifestBody = `${JSON.stringify(remote, null, 2)}\n`;
  for (const key of [
    seedKey(local.schemaFingerprint, "manifest.json"),
    LATEST_KEY,
  ]) {
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: manifestBody,
        ContentType: "application/json",
      }),
    );
  }
  return { ...remote, compressedBytes: body.length };
}

async function readRemoteManifest(client, key) {
  try {
    const response = await client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    );
    return JSON.parse(await response.Body.transformToString());
  } catch (error) {
    if (error instanceof NoSuchKey) return null;
    throw error;
  }
}

/** Replace the local seed with the published seed. Local edits are removed. */
export async function pullRealisticDataSeed() {
  const client = r2Client();
  const fingerprint = realisticDataSchemaFingerprint(seedPaths.schema);
  const remote =
    (await readRemoteManifest(client, seedKey(fingerprint, "manifest.json"))) ??
    (await readRemoteManifest(client, LATEST_KEY));
  if (!remote) {
    throw new Error(
      "No published seed. Run `pnpm db:seed:publish` on the Mac.",
    );
  }
  mkdirSync(seedDirectory, { recursive: true, mode: 0o700 });
  const staging = mkdtempSync(path.join(seedDirectory, ".pull-"));
  try {
    const stagedPath = path.join(staging, "realistic-data.sqlite");
    const response = await client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: remote.key }),
    );
    await pipeline(
      Readable.fromWeb(response.Body.transformToWebStream()),
      createGunzip(),
      createWriteStream(stagedPath, { mode: 0o600 }),
    );
    if (sha256File(stagedPath) !== remote.sha256) {
      throw new Error("The downloaded seed does not match its checksum.");
    }
    for (const suffix of ["", "-journal", "-wal", "-shm"]) {
      rmSync(`${seedPaths.database}${suffix}`, { force: true });
    }
    renameSync(stagedPath, seedPaths.database);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
  const {
    key: _key,
    sha256: _sha,
    schemaFingerprint: _fp,
    ...details
  } = remote;
  return finishLocalSeed(details);
}

/**
 * Make sure a local seed exists for the current schema. Keep local edits when possible.
 * @returns {Promise<{ databasePath: string }>}
 */
export async function ensureRealisticDataSeed() {
  if (!existsSync(seedPaths.manifest) || !existsSync(seedPaths.database)) {
    console.log("Downloading the realistic seed...");
    return pullRealisticDataSeed();
  }
  const local = JSON.parse(readFileSync(seedPaths.manifest, "utf8"));
  if (
    local.schemaFingerprint === realisticDataSchemaFingerprint(seedPaths.schema)
  ) {
    return local;
  }
  console.log("Updating the local seed to the current schema...");
  const {
    databasePath: _db,
    searchIndexPath: _search,
    schemaFingerprint: _fp,
    ...details
  } = local;
  return finishLocalSeed(details);
}
