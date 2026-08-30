import "server-only";

import { isIP } from "node:net";

import {
  inquiryReceiptSchema,
  type Inquiry,
  type InquiryReceipt,
} from "@daylily-catalog/storefront-contract";

import {
  getStorefrontApiBaseUrl,
  getStorefrontSiteConfig,
} from "@/config/storefront-site-config";

export interface InquiryAdapter {
  deliver(
    inquiry: Inquiry,
    context?: InquiryDeliveryContext,
  ): Promise<InquiryReceipt>;
}

export interface InquiryDeliveryContext {
  clientIp?: string;
}

export class InquiryConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InquiryConfigurationError";
  }
}

export class InquiryRateLimitError extends Error {
  constructor(readonly retryAfter: string | null) {
    super("Inquiry delivery was rate limited.");
    this.name = "InquiryRateLimitError";
  }
}

export class InquiryConflictError extends Error {
  constructor() {
    super("Inquiry cart data changed before delivery.");
    this.name = "InquiryConflictError";
  }
}

export class StubInquiryAdapter implements InquiryAdapter {
  readonly deliveries: Inquiry[] = [];

  async deliver(inquiry: Inquiry): Promise<InquiryReceipt> {
    this.deliveries.push(structuredClone(inquiry));
    return {
      id: `stub-${this.deliveries.length}`,
      acceptedAt: new Date().toISOString(),
    };
  }
}

export class RemoteInquiryAdapter implements InquiryAdapter {
  constructor(
    private readonly endpoint: string,
    private readonly token?: string,
  ) {}

  async deliver(
    inquiry: Inquiry,
    context: InquiryDeliveryContext = {},
  ): Promise<InquiryReceipt> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        ...(context.clientIp
          ? { "x-storefront-client-ip": context.clientIp }
          : {}),
      },
      body: JSON.stringify(inquiry),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      throw new InquiryRateLimitError(
        retryAfter && /^\d{1,6}$/.test(retryAfter) ? retryAfter : null,
      );
    }
    if (response.status === 409) {
      throw new InquiryConflictError();
    }
    if (!response.ok) {
      throw new Error(
        `Inquiry delivery failed with status ${response.status}.`,
      );
    }
    if (response.status !== 202) {
      throw new Error(
        `Inquiry delivery returned unexpected status ${response.status}.`,
      );
    }
    const value: unknown = await response.json();
    const result = inquiryReceiptSchema.safeParse(value);
    if (!result.success) {
      throw new Error("Inquiry delivery returned an invalid receipt.");
    }
    return result.data;
  }
}

let sharedStub: StubInquiryAdapter | undefined;

type InquiryAdapterConfiguration =
  | { kind: "stub" }
  | { kind: "remote"; endpoint: string; token?: string };

function buildInquiryEndpoint(apiBaseUrl: string, sellerId: string) {
  return new URL(
    `/api/v1/storefronts/${encodeURIComponent(sellerId)}/inquiries`,
    apiBaseUrl,
  ).toString();
}

export function getTrustedClientIp(request: Request): string | undefined {
  const value = request.headers.get("cf-connecting-ip")?.trim();
  if (!value || value.includes(",") || isIP(value) === 0) {
    return undefined;
  }
  return value;
}

function getInquiryAdapterConfiguration(): InquiryAdapterConfiguration {
  const mode =
    process.env.STOREFRONT_INQUIRY_ADAPTER ??
    (process.env.NODE_ENV === "production" ? "remote" : "stub");

  if (mode === "stub") {
    if (process.env.NODE_ENV === "production") {
      throw new InquiryConfigurationError(
        "The stub inquiry adapter is not available in production.",
      );
    }
    return { kind: "stub" };
  }

  if (mode !== "remote") {
    throw new InquiryConfigurationError(`Unknown inquiry adapter: ${mode}.`);
  }

  const configuredToken = process.env.STOREFRONT_INQUIRY_TOKEN?.trim();
  const token = configuredToken === "" ? undefined : configuredToken;
  if (!token) {
    throw new InquiryConfigurationError(
      "STOREFRONT_INQUIRY_TOKEN is required for remote inquiries.",
    );
  }

  try {
    const site = getStorefrontSiteConfig();
    return {
      kind: "remote",
      endpoint: buildInquiryEndpoint(getStorefrontApiBaseUrl(), site.sellerId),
      token,
    };
  } catch {
    throw new InquiryConfigurationError(
      "Storefront API configuration is invalid for remote inquiries.",
    );
  }
}

export function assertInquiryDeliveryReady(): void {
  getInquiryAdapterConfiguration();
}

export function getInquiryAdapter(): InquiryAdapter {
  const configuration = getInquiryAdapterConfiguration();
  if (configuration.kind === "stub") {
    sharedStub ??= new StubInquiryAdapter();
    return sharedStub;
  }
  return new RemoteInquiryAdapter(configuration.endpoint, configuration.token);
}
