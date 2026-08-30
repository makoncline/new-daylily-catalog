import "server-only";

import {
  storefrontSiteIdentities,
  type StorefrontSiteIdentity,
} from "@daylily-catalog/storefront-contract";

import type { StorefrontSiteConfig } from "@/types/storefront";

type StorefrontSitePresentation = Omit<
  StorefrontSiteConfig,
  "canonicalUrl" | "hostnames" | "key" | "sellerId" | "source"
>;
type StorefrontSiteDefinition = StorefrontSiteIdentity &
  StorefrontSitePresentation;

const rollingOaksIdentity = storefrontSiteIdentities.find(
  (identity) => identity.siteKey === "rolling-oaks",
);
if (!rollingOaksIdentity) {
  throw new Error("The Rolling Oaks storefront identity is not approved.");
}

const rollingOaksSite = {
  ...rollingOaksIdentity,
  brand: {
    name: "Rolling Oaks Daylilies",
    shortName: "Rolling Oaks",
    title: "Rolling Oaks Daylilies - Purchase Unique and Rare Varieties",
    description:
      "Shop more than 1,000 named daylilies and seedlings, including double, white, spider, and unusual forms.",
    logoPath: "/brands/rolling-oaks/logo.svg",
    homeImagePaths: [
      "/brands/rolling-oaks/home-1.jpg",
      "/brands/rolling-oaks/home-2.jpg",
      "/brands/rolling-oaks/home-3.jpg",
    ],
    socialImage: {
      path: "/brands/rolling-oaks/logo-square.png",
      width: 803,
      height: 803,
      type: "image/png",
    },
    themeColor: "#24412d",
  },
  contact: {
    email: "kaymcline@gmail.com",
    phone: "+1-601-590-1349",
    mapsUrl: "https://goo.gl/maps/BKg722pc9e52",
  },
  commerce: {
    minimumOrder: 20,
    shipping: {
      baseRate: 15,
      baseItems: 3,
      additionalItemRate: 1.5,
    },
    orderingCopy:
      "Choose your favorite daylilies with a $20 minimum plant order. Prices are for double fans, which can share one root system and can include small dormant plants. Confirm availability before payment. Checks payable to Kay Cline, PayPal, and Venmo (@Karen-Cline-13) are accepted.",
    shippingCopy:
      "Orders ship by USPS Priority Mail on Monday or Tuesday. Shipping is not available to California or outside the United States.",
    rustNotice: {
      text: "Our mild southern climate is good for daylilies, but daylily rust can overwinter. We cannot guarantee rust-free plants.",
      url: "https://www.daylilies.org/ahs_dictionary/daylily_rust.html",
    },
  },
} as const satisfies StorefrontSiteDefinition;

const storefrontSites = {
  [rollingOaksSite.siteKey]: rollingOaksSite,
} as const satisfies Record<string, StorefrontSiteDefinition>;

function normalizeHostname(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed}`,
    );
    return parsed.hostname.replace(/\.$/, "");
  } catch {
    return trimmed.split(":")[0]?.replace(/\.$/, "") ?? "";
  }
}

function getSiteDefinition() {
  const requestedKey = process.env.STOREFRONT_SITE_KEY?.trim();
  const requestedHostname = normalizeHostname(
    process.env.STOREFRONT_HOSTNAME ?? "",
  );
  if (process.env.NODE_ENV === "production") {
    if (!requestedKey) {
      throw new Error("STOREFRONT_SITE_KEY is required in production.");
    }
    if (!requestedHostname) {
      throw new Error("STOREFRONT_HOSTNAME is required in production.");
    }
  }

  let selectedSite: StorefrontSiteDefinition | undefined;
  if (requestedKey) {
    const site = storefrontSites[requestedKey as keyof typeof storefrontSites];
    if (!site) {
      throw new Error(`Unknown storefront site key: ${requestedKey}`);
    }
    selectedSite = site;
  }

  if (!selectedSite && requestedHostname) {
    const site = Object.values(storefrontSites).find((candidate) =>
      candidate.hostnames.some(
        (configuredHostname) => configuredHostname === requestedHostname,
      ),
    );
    if (!site) {
      throw new Error(`No storefront is configured for ${requestedHostname}`);
    }
    selectedSite = site;
  }

  selectedSite ??= rollingOaksSite;
  if (
    requestedHostname &&
    !selectedSite.hostnames.includes(requestedHostname)
  ) {
    throw new Error(
      `STOREFRONT_HOSTNAME does not match the approved host for ${selectedSite.siteKey}.`,
    );
  }

  return selectedSite;
}

export function getStorefrontApiBaseUrl(): string {
  const rawApiBaseUrl =
    process.env.STOREFRONT_API_BASE_URL ?? "https://daylilycatalog.com";
  const apiBaseUrl = new URL(rawApiBaseUrl);
  const isNonProductionLoopback =
    process.env.NODE_ENV !== "production" &&
    apiBaseUrl.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(apiBaseUrl.hostname);
  if (apiBaseUrl.protocol !== "https:" && !isNonProductionLoopback) {
    throw new Error(
      "STOREFRONT_API_BASE_URL must use HTTPS in production. Plain HTTP is available only for a non-production loopback URL.",
    );
  }

  return apiBaseUrl.toString().replace(/\/$/, "");
}

function getDataSource(): StorefrontSiteConfig["source"] {
  const requestedSource = process.env.STOREFRONT_DATA_SOURCE?.trim();
  if (requestedSource && !["fixture", "remote"].includes(requestedSource)) {
    throw new Error(`Unknown storefront data source: ${requestedSource}`);
  }

  const kind =
    requestedSource ??
    (process.env.NODE_ENV === "production" ? "remote" : "fixture");
  if (kind === "fixture") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "The fixture storefront source is available only in local development and tests.",
      );
    }
    return { kind: "fixture" };
  }

  return { kind: "remote", apiBaseUrl: getStorefrontApiBaseUrl() };
}

export function getStorefrontSiteConfig(): StorefrontSiteConfig {
  const site = getSiteDefinition();
  const source = getDataSource();
  let sellerId = process.env.STOREFRONT_SELLER_ID?.trim();
  if (sellerId === "") {
    sellerId = undefined;
  }
  if (
    !sellerId &&
    (source.kind === "remote" || process.env.NODE_ENV === "production")
  ) {
    throw new Error(
      "STOREFRONT_SELLER_ID is required in production and for the remote storefront source.",
    );
  }
  if (
    process.env.NODE_ENV === "production" &&
    sellerId !== site.expectedSellerId
  ) {
    throw new Error(
      `STOREFRONT_SELLER_ID does not match the approved seller for ${site.siteKey}.`,
    );
  }

  return {
    key: site.siteKey,
    canonicalUrl: site.canonicalUrl,
    hostnames: site.hostnames,
    sellerId: sellerId ?? site.expectedSellerId,
    brand: site.brand,
    contact: site.contact,
    commerce: site.commerce,
    source,
  };
}
