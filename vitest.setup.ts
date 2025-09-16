// Basic test environment setup for jsdom
import "@testing-library/jest-dom";

// Polyfill crypto.randomUUID if missing in jsdom
if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = {} as Crypto;
}
if (!(globalThis as any).crypto.randomUUID) {
  (globalThis as any).crypto.randomUUID = () =>
    "00000000-0000-4000-8000-000000000000";
}
