import { Buffer } from "node:buffer";
import { pathToFileURL } from "node:url";
import { storefrontSiteIdentities } from "@daylily-catalog/storefront-contract";

export const INTERNAL_REFRESH_URL =
  "http://127.0.0.1:3000/api/internal/storefront-artifacts/refresh";

const CLOUDFLARE_API_ROOT = "https://api.cloudflare.com/client/v4";
const API_CACHE_TAG = "daylily-storefront-data";
const SITE_CACHE_TAG = "daylily-storefront-public-html";
const INTERNAL_REFRESH_TIMEOUT_MILLISECONDS = 15 * 60 * 1_000;
const CLOUDFLARE_PURGE_TIMEOUT_MILLISECONDS = 30 * 1_000;
const TARGET_KEYS = [
  "cachePurgeToken",
  "cacheTag",
  "hostname",
  "sellerId",
  "siteKey",
  "zoneId",
];
const SELLER_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/u;
const SITE_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const HOSTNAME_PATTERN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u;
const ZONE_ID_PATTERN = /^[a-f0-9]{32}$/u;
const CLOUDFLARE_TOKEN_PATTERN = /^[A-Za-z0-9._~-]{16,512}$/u;
const storefrontSiteIdentitiesByKey = new Map(
  storefrontSiteIdentities.map((identity) => [identity.siteKey, identity]),
);

function requireEnvironmentValue(env, name) {
  const value = env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function isCanonicalRefreshToken(value) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    return false;
  }

  const bytes = Buffer.from(value, "base64url");
  return bytes.byteLength >= 32 && bytes.toString("base64url") === value;
}

function parseSellerIds(value) {
  const sellerIds = value.split(",").map((sellerId) => sellerId.trim());
  if (
    sellerIds.length === 0 ||
    sellerIds.some((sellerId) => !SELLER_ID_PATTERN.test(sellerId)) ||
    new Set(sellerIds).size !== sellerIds.length
  ) {
    throw new Error("PUBLIC_STOREFRONT_SELLER_IDS is invalid.");
  }
  return sellerIds;
}

function requireExactTargetKeys(target) {
  if (target === null || typeof target !== "object" || Array.isArray(target)) {
    throw new Error("Each storefront purge target must be an object.");
  }

  const keys = Object.keys(target).sort();
  if (
    keys.length !== TARGET_KEYS.length ||
    keys.some((key, index) => key !== TARGET_KEYS[index])
  ) {
    throw new Error("Each storefront purge target must use the exact keys.");
  }
}

function parseSiteTargets(value, sellerIds, apiCredential) {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(
      "STOREFRONT_SITE_CLOUDFLARE_PURGE_TARGETS_JSON must be valid JSON.",
    );
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(
      "STOREFRONT_SITE_CLOUDFLARE_PURGE_TARGETS_JSON must be a nonempty array.",
    );
  }

  const allowedSellerIds = new Set(sellerIds);
  const targetSellerIds = new Set();
  const siteKeys = new Set();
  const hostnames = new Set();
  const zoneTokenPairs = new Set([
    `${apiCredential.zoneId}\u0000${apiCredential.token}`,
  ]);
  const tokens = new Set([apiCredential.token]);

  for (const target of parsed) {
    requireExactTargetKeys(target);

    const { cachePurgeToken, cacheTag, hostname, sellerId, siteKey, zoneId } =
      target;
    if (typeof sellerId !== "string" || !SELLER_ID_PATTERN.test(sellerId)) {
      throw new Error("A storefront purge target has an invalid sellerId.");
    }
    if (typeof siteKey !== "string" || !SITE_KEY_PATTERN.test(siteKey)) {
      throw new Error("A storefront purge target has an invalid siteKey.");
    }
    if (typeof hostname !== "string" || !HOSTNAME_PATTERN.test(hostname)) {
      throw new Error("A storefront purge target has an invalid hostname.");
    }
    if (typeof zoneId !== "string" || !ZONE_ID_PATTERN.test(zoneId)) {
      throw new Error("A storefront purge target has an invalid zoneId.");
    }
    if (
      typeof cachePurgeToken !== "string" ||
      !CLOUDFLARE_TOKEN_PATTERN.test(cachePurgeToken)
    ) {
      throw new Error(
        "A storefront purge target has an invalid cachePurgeToken.",
      );
    }
    if (cacheTag !== SITE_CACHE_TAG) {
      throw new Error(
        `Each storefront purge target cacheTag must be ${SITE_CACHE_TAG}.`,
      );
    }
    const approvedIdentity = storefrontSiteIdentitiesByKey.get(siteKey);
    if (!approvedIdentity) {
      throw new Error("A storefront purge target has an unapproved siteKey.");
    }
    if (sellerId !== approvedIdentity.expectedSellerId) {
      throw new Error(
        `The storefront purge target sellerId does not match ${siteKey}.`,
      );
    }
    if (!approvedIdentity.hostnames.includes(hostname)) {
      throw new Error(
        `The storefront purge target hostname does not match ${siteKey}.`,
      );
    }
    if (!allowedSellerIds.has(sellerId)) {
      throw new Error(
        "A storefront purge target contains a seller outside the allowlist.",
      );
    }
    if (targetSellerIds.has(sellerId)) {
      throw new Error("Each allowlisted seller must have exactly one target.");
    }
    if (siteKeys.has(siteKey)) {
      throw new Error("Storefront purge target site keys must be unique.");
    }
    if (hostnames.has(hostname)) {
      throw new Error("Storefront purge target hostnames must be unique.");
    }

    const zoneTokenPair = `${zoneId}\u0000${cachePurgeToken}`;
    if (zoneTokenPairs.has(zoneTokenPair)) {
      throw new Error(
        "Storefront purge target zone and token pairs must be unique.",
      );
    }
    if (tokens.has(cachePurgeToken)) {
      throw new Error(
        "Each Cloudflare purge target must use a distinct token.",
      );
    }

    targetSellerIds.add(sellerId);
    siteKeys.add(siteKey);
    hostnames.add(hostname);
    zoneTokenPairs.add(zoneTokenPair);
    tokens.add(cachePurgeToken);
  }

  if (
    targetSellerIds.size !== allowedSellerIds.size ||
    sellerIds.some((sellerId) => !targetSellerIds.has(sellerId))
  ) {
    throw new Error("Each allowlisted seller must have exactly one target.");
  }

  return parsed;
}

export function parseStorefrontArtifactRefreshConfig(env = process.env) {
  const sellerIds = parseSellerIds(
    requireEnvironmentValue(env, "PUBLIC_STOREFRONT_SELLER_IDS"),
  );
  const refreshToken = requireEnvironmentValue(
    env,
    "STOREFRONT_ARTIFACT_REFRESH_TOKEN",
  );
  if (!isCanonicalRefreshToken(refreshToken)) {
    throw new Error(
      "STOREFRONT_ARTIFACT_REFRESH_TOKEN must be canonical unpadded base64url for at least 32 bytes.",
    );
  }

  const apiZoneId = requireEnvironmentValue(
    env,
    "STOREFRONT_API_CLOUDFLARE_ZONE_ID",
  );
  if (!ZONE_ID_PATTERN.test(apiZoneId)) {
    throw new Error(
      "STOREFRONT_API_CLOUDFLARE_ZONE_ID must be a 32-character lowercase hexadecimal ID.",
    );
  }

  const apiPurgeToken = requireEnvironmentValue(
    env,
    "STOREFRONT_API_CLOUDFLARE_CACHE_PURGE_TOKEN",
  );
  if (!CLOUDFLARE_TOKEN_PATTERN.test(apiPurgeToken)) {
    throw new Error("STOREFRONT_API_CLOUDFLARE_CACHE_PURGE_TOKEN is invalid.");
  }

  const siteTargets = parseSiteTargets(
    requireEnvironmentValue(
      env,
      "STOREFRONT_SITE_CLOUDFLARE_PURGE_TARGETS_JSON",
    ),
    sellerIds,
    { token: apiPurgeToken, zoneId: apiZoneId },
  );

  return {
    apiPurgeToken,
    apiZoneId,
    refreshToken,
    sellerIds,
    siteTargets,
  };
}

async function readJson(response, operation) {
  const body = await response.text();
  if (body.length > 1_000_000) {
    throw new Error(`${operation} returned an oversized response.`);
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`${operation} returned invalid JSON.`);
  }
}

function validateRefreshReceipt(value, sellerIds) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    typeof value.generatedAt !== "string" ||
    !Array.isArray(value.sellers) ||
    value.sellers.some(
      (sellerId) =>
        typeof sellerId !== "string" || !SELLER_ID_PATTERN.test(sellerId),
    )
  ) {
    throw new Error("The internal refresh returned an invalid receipt.");
  }

  const receiptSellerIds = new Set(value.sellers);
  const configuredSellerIds = new Set(sellerIds);
  if (
    receiptSellerIds.size !== value.sellers.length ||
    receiptSellerIds.size !== configuredSellerIds.size ||
    sellerIds.some((sellerId) => !receiptSellerIds.has(sellerId))
  ) {
    throw new Error(
      "The internal refresh seller set differs from the allowlist.",
    );
  }

  return value.generatedAt;
}

async function triggerRefresh(fetchImpl, config) {
  const response = await fetchImpl(INTERNAL_REFRESH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.refreshToken}`,
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(INTERNAL_REFRESH_TIMEOUT_MILLISECONDS),
  });
  if (!response.ok) {
    throw new Error(
      `The internal refresh failed with HTTP ${response.status}.`,
    );
  }

  return readJson(response, "The internal refresh");
}

async function purgeCloudflareCacheTag(
  fetchImpl,
  { cacheTag, label, token, zoneId },
) {
  const response = await fetchImpl(
    `${CLOUDFLARE_API_ROOT}/zones/${zoneId}/purge_cache`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tags: [cacheTag] }),
      redirect: "error",
      signal: AbortSignal.timeout(CLOUDFLARE_PURGE_TIMEOUT_MILLISECONDS),
    },
  );

  if (!response.ok) {
    throw new Error(`Cloudflare purge failed for ${label}.`);
  }
  const result = await readJson(response, `Cloudflare purge for ${label}`);
  if (
    result === null ||
    typeof result !== "object" ||
    Array.isArray(result) ||
    result.success !== true
  ) {
    throw new Error(`Cloudflare purge failed for ${label}.`);
  }
}

export async function runStorefrontArtifactRefreshOperation({
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required.");
  }

  const config = parseStorefrontArtifactRefreshConfig(env);
  const refreshReceipt = await triggerRefresh(fetchImpl, config);
  const generatedAt = validateRefreshReceipt(refreshReceipt, config.sellerIds);

  await purgeCloudflareCacheTag(fetchImpl, {
    cacheTag: API_CACHE_TAG,
    label: "the storefront API zone",
    token: config.apiPurgeToken,
    zoneId: config.apiZoneId,
  });

  for (const target of config.siteTargets) {
    await purgeCloudflareCacheTag(fetchImpl, {
      cacheTag: target.cacheTag,
      label: `site ${target.siteKey}`,
      token: target.cachePurgeToken,
      zoneId: target.zoneId,
    });
  }

  return {
    generatedAt,
    sellers: config.sellerIds,
    purgedSites: config.siteTargets.map((target) => target.siteKey),
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runStorefrontArtifactRefreshOperation()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown error.";
      process.stderr.write(`Storefront refresh failed: ${message}\n`);
      process.exitCode = 1;
    });
}
