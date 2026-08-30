import type { StorefrontSnapshot } from "@daylily-catalog/storefront-contract";

export * from "@daylily-catalog/storefront-contract";

export interface StorefrontSiteConfig {
  key: string;
  canonicalUrl: string;
  hostnames: readonly string[];
  sellerId: string;
  brand: {
    name: string;
    shortName: string;
    title: string;
    description: string;
    logoPath: string | null;
    homeImagePaths: readonly string[];
    socialImage: {
      path: string;
      width: number;
      height: number;
      type: string;
    } | null;
    themeColor: string;
  };
  contact: {
    email: string | null;
    phone: string | null;
    mapsUrl: string | null;
  };
  commerce: {
    minimumOrder: number;
    shipping: {
      baseRate: number;
      baseItems: number;
      additionalItemRate: number;
    };
    orderingCopy: string | null;
    shippingCopy: string | null;
    rustNotice: { text: string; url: string } | null;
  };
  source:
    | { kind: "fixture" }
    | {
        kind: "remote";
        apiBaseUrl: string;
      };
}

export type StorefrontSnapshotStatus =
  | {
      state: "ready";
      degraded: false;
      source: "fixture" | "remote" | "remote-not-modified";
      snapshot: StorefrontSnapshot;
      checkedAt: string;
      etag: string | null;
    }
  | {
      state: "degraded";
      degraded: true;
      source: "last-known-good";
      snapshot: StorefrontSnapshot;
      checkedAt: string;
      etag: string | null;
      reason: string;
    };

export interface StorefrontAdapter {
  load(): Promise<StorefrontSnapshotStatus>;
}
