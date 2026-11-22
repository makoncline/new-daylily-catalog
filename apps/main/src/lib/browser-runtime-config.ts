export interface BrowserRuntimeConfig {
  features?: unknown;
  sentry?: {
    enabled?: boolean;
    dsn?: string;
    environment?: string;
    release?: string | null;
  };
  posthog?: {
    enabled?: boolean;
    key?: string;
    host?: string;
  };
}

let runtimeConfigPromise: Promise<BrowserRuntimeConfig> | undefined;

async function fetchRuntimeConfig(): Promise<BrowserRuntimeConfig> {
  const response = await fetch("/api/runtime-config", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Runtime config request failed: ${response.status}`);
  }

  return (await response.json()) as BrowserRuntimeConfig;
}

export function getBrowserRuntimeConfig(): Promise<BrowserRuntimeConfig> {
  runtimeConfigPromise ??= fetchRuntimeConfig().catch((error: unknown) => {
    runtimeConfigPromise = undefined;
    throw error;
  });
  return runtimeConfigPromise;
}
