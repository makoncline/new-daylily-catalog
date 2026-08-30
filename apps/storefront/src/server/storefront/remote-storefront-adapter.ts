import type {
  StorefrontAdapter,
  StorefrontSnapshot,
  StorefrontSnapshotStatus,
} from "@/types/storefront";
import { storefrontSnapshotSchema } from "@/types/storefront";
import {
  StorefrontContractError,
  StorefrontNotFoundError,
  StorefrontUnavailableError,
} from "./errors";

interface RemoteStorefrontAdapterOptions {
  apiBaseUrl: string;
  sellerId: string;
  fetchImplementation?: typeof fetch;
  now?: () => Date;
  timeoutMilliseconds?: number;
}

interface LastKnownGood {
  snapshot: StorefrontSnapshot;
  etag: string | null;
}

const allowedFutureSkewMilliseconds = 5 * 60 * 1_000;

export function buildStorefrontEndpoint(apiBaseUrl: string, sellerId: string) {
  const baseUrl = new URL(apiBaseUrl);
  baseUrl.pathname = `/api/v1/storefronts/${encodeURIComponent(sellerId)}`;
  baseUrl.search = "";
  baseUrl.hash = "";
  return baseUrl.toString();
}

function degradedStatus(
  lastKnownGood: LastKnownGood,
  checkedAt: string,
  error: unknown,
): StorefrontSnapshotStatus {
  return {
    state: "degraded",
    degraded: true,
    source: "last-known-good",
    snapshot: lastKnownGood.snapshot,
    checkedAt,
    etag: lastKnownGood.etag,
    reason:
      error instanceof Error ? error.message : "The remote request failed.",
  };
}

export function createRemoteStorefrontAdapter({
  apiBaseUrl,
  sellerId,
  fetchImplementation = fetch,
  now = () => new Date(),
  timeoutMilliseconds = 8_000,
}: RemoteStorefrontAdapterOptions): StorefrontAdapter {
  const endpoint = buildStorefrontEndpoint(apiBaseUrl, sellerId);
  let lastKnownGood: LastKnownGood | null = null;
  let inFlight: Promise<StorefrontSnapshotStatus> | null = null;

  async function loadRemote(): Promise<StorefrontSnapshotStatus> {
    const checkedAt = now().toISOString();
    const headers = new Headers({ Accept: "application/json" });
    if (lastKnownGood?.etag) {
      headers.set("If-None-Match", lastKnownGood.etag);
    }

    try {
      const response = await fetchImplementation(endpoint, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(timeoutMilliseconds),
      });

      if (response.status === 404) {
        lastKnownGood = null;
        throw new StorefrontNotFoundError();
      }

      if (response.status === 304) {
        if (!lastKnownGood) {
          throw new StorefrontContractError(
            "The storefront API returned 304 before it returned data.",
          );
        }

        return {
          state: "ready",
          degraded: false,
          source: "remote-not-modified",
          snapshot: lastKnownGood.snapshot,
          checkedAt,
          etag: lastKnownGood.etag,
        };
      }

      if (!response.ok) {
        throw new StorefrontUnavailableError(
          `The storefront API returned HTTP ${response.status}.`,
        );
      }

      const result = storefrontSnapshotSchema.safeParse(await response.json());
      if (!result.success) {
        throw new StorefrontContractError();
      }
      if (result.data.seller.id !== sellerId) {
        throw new StorefrontContractError(
          "The storefront API returned data for a different seller.",
        );
      }
      if (
        Date.parse(result.data.generatedAt) >
        Date.parse(checkedAt) + allowedFutureSkewMilliseconds
      ) {
        throw new StorefrontContractError(
          "The storefront API returned a snapshot generated too far in the future.",
        );
      }

      const etag = response.headers.get("etag");
      lastKnownGood = { snapshot: result.data, etag };

      return {
        state: "ready",
        degraded: false,
        source: "remote",
        snapshot: result.data,
        checkedAt,
        etag,
      };
    } catch (error) {
      if (error instanceof StorefrontNotFoundError) {
        throw error;
      }
      if (lastKnownGood) {
        return degradedStatus(lastKnownGood, checkedAt, error);
      }
      if (
        error instanceof StorefrontContractError ||
        error instanceof StorefrontUnavailableError
      ) {
        throw error;
      }
      throw new StorefrontUnavailableError();
    }
  }

  return {
    async load(): Promise<StorefrontSnapshotStatus> {
      if (inFlight) {
        return inFlight;
      }

      inFlight = loadRemote();
      try {
        return await inFlight;
      } finally {
        inFlight = null;
      }
    },
  };
}
