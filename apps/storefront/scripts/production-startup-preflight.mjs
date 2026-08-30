import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  isCanonicalStorefrontBearerToken,
  storefrontSiteIdentities,
} from "../../../packages/storefront-contract/src/runtime.js";

function requireValue(environment, name) {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required in production.`);
  }
  return value;
}

function normalizeHostname(value) {
  const trimmed = value.trim().toLowerCase();
  try {
    const parsed = new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed}`,
    );
    return parsed.hostname.replace(/\.$/u, "");
  } catch {
    return "";
  }
}

function requireRemoteApiBaseUrl(environment) {
  const rawApiBaseUrl = requireValue(environment, "STOREFRONT_API_BASE_URL");

  let apiBaseUrl;
  try {
    apiBaseUrl = new URL(rawApiBaseUrl);
  } catch {
    throw new Error(
      "STOREFRONT_API_BASE_URL must be an absolute HTTPS URL in production.",
    );
  }

  if (apiBaseUrl.protocol !== "https:") {
    throw new Error(
      "STOREFRONT_API_BASE_URL must be an absolute HTTPS URL in production.",
    );
  }
}

export function assertProductionStartupEnvironment(environment = process.env) {
  if (environment.NODE_ENV !== "production") {
    throw new Error("NODE_ENV must be production in the storefront container.");
  }

  const siteKey = requireValue(environment, "STOREFRONT_SITE_KEY");
  const site = storefrontSiteIdentities.find(
    (candidate) => candidate.siteKey === siteKey,
  );
  if (!site) {
    throw new Error("STOREFRONT_SITE_KEY is not approved.");
  }

  const hostname = normalizeHostname(
    requireValue(environment, "STOREFRONT_HOSTNAME"),
  );
  if (!hostname || !site.hostnames.includes(hostname)) {
    throw new Error(
      `STOREFRONT_HOSTNAME does not match the approved host for ${site.siteKey}.`,
    );
  }

  const sellerId = requireValue(environment, "STOREFRONT_SELLER_ID");
  if (sellerId !== site.expectedSellerId) {
    throw new Error(
      `STOREFRONT_SELLER_ID does not match the approved seller for ${site.siteKey}.`,
    );
  }

  if (requireValue(environment, "STOREFRONT_DATA_SOURCE") !== "remote") {
    throw new Error("STOREFRONT_DATA_SOURCE must be remote in production.");
  }
  requireRemoteApiBaseUrl(environment);

  if (requireValue(environment, "STOREFRONT_INQUIRY_ADAPTER") !== "remote") {
    throw new Error("STOREFRONT_INQUIRY_ADAPTER must be remote in production.");
  }

  const inquiryToken = requireValue(environment, "STOREFRONT_INQUIRY_TOKEN");
  if (!isCanonicalStorefrontBearerToken(inquiryToken)) {
    throw new Error(
      "STOREFRONT_INQUIRY_TOKEN must be canonical unpadded base64url for at least 32 bytes.",
    );
  }
}

const invokedPath = process.argv[1];
const isDirectInvocation =
  invokedPath &&
  realpathSync(invokedPath) === realpathSync(fileURLToPath(import.meta.url));

if (isDirectInvocation) {
  try {
    assertProductionStartupEnvironment();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The production storefront configuration is invalid.";
    console.error(`Storefront startup preflight failed: ${message}`);
    process.exitCode = 1;
  }
}
