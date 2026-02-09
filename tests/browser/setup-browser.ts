import "@/styles/globals.css";

if (typeof globalThis.process === "undefined") {
  Object.defineProperty(globalThis, "process", {
    value: { env: { NODE_ENV: "test" } },
    writable: true,
  });
}

const env = process.env as Record<string, string | undefined>;
env.NODE_ENV = "test";
env.NEXT_PUBLIC_CLOUDFLARE_URL = "https://cdn.test";
