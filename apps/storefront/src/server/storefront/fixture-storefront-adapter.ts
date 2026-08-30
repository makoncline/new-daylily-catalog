import type {
  StorefrontAdapter,
  StorefrontSnapshot,
  StorefrontSnapshotStatus,
} from "@/types/storefront";
import { storefrontSnapshotSchema } from "@/types/storefront";

interface FixtureStorefrontAdapterOptions {
  snapshot: StorefrontSnapshot;
  now?: () => Date;
}

export function createFixtureStorefrontAdapter({
  snapshot,
  now = () => new Date(),
}: FixtureStorefrontAdapterOptions): StorefrontAdapter {
  const validatedSnapshot = storefrontSnapshotSchema.parse(snapshot);

  return {
    async load(): Promise<StorefrontSnapshotStatus> {
      return {
        state: "ready",
        degraded: false,
        source: "fixture",
        snapshot: validatedSnapshot,
        checkedAt: now().toISOString(),
        etag: null,
      };
    },
  };
}
