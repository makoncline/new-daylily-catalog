import "server-only";

import { getStorefrontSiteConfig } from "@/config/storefront-site-config";
import { rollingOaksStorefrontFixture } from "@/fixtures/rolling-oaks-storefront";
import type {
  StorefrontAdapter,
  StorefrontSiteConfig,
  StorefrontSnapshot,
  StorefrontSnapshotStatus,
} from "@/types/storefront";
import {
  findStorefrontListBySlug,
  findStorefrontListingBySlug,
} from "@/types/storefront-query";
import { createFixtureStorefrontAdapter } from "./fixture-storefront-adapter";
import { createRemoteStorefrontAdapter } from "./remote-storefront-adapter";

const adapters = new Map<string, StorefrontAdapter>();

function getAdapterKey(config: StorefrontSiteConfig) {
  return config.source.kind === "fixture"
    ? `${config.key}:${config.sellerId}:fixture`
    : `${config.key}:${config.sellerId}:remote:${config.source.apiBaseUrl}`;
}

function createAdapter(config: StorefrontSiteConfig) {
  if (config.source.kind === "fixture") {
    const snapshot = structuredClone(rollingOaksStorefrontFixture);
    snapshot.seller.id = config.sellerId;
    return createFixtureStorefrontAdapter({ snapshot });
  }

  return createRemoteStorefrontAdapter({
    apiBaseUrl: config.source.apiBaseUrl,
    sellerId: config.sellerId,
  });
}

function getAdapter(config: StorefrontSiteConfig) {
  const key = getAdapterKey(config);
  const existing = adapters.get(key);
  if (existing) {
    return existing;
  }

  const adapter = createAdapter(config);
  adapters.set(key, adapter);
  return adapter;
}

export async function getStorefrontSnapshotStatus(
  config = getStorefrontSiteConfig(),
): Promise<StorefrontSnapshotStatus> {
  return getAdapter(config).load();
}

export async function getStorefrontSnapshot(
  config = getStorefrontSiteConfig(),
): Promise<StorefrontSnapshot> {
  return (await getStorefrontSnapshotStatus(config)).snapshot;
}

export async function getStorefrontListingBySlug(
  slug: string,
  config = getStorefrontSiteConfig(),
) {
  return findStorefrontListingBySlug(await getStorefrontSnapshot(config), slug);
}

export async function getStorefrontListBySlug(
  slug: string,
  config = getStorefrontSiteConfig(),
) {
  return findStorefrontListBySlug(await getStorefrontSnapshot(config), slug);
}
