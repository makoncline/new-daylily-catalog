// Basic test environment setup for jsdom
import "@testing-library/jest-dom/vitest";

// jsdom doesn't always provide crypto.randomUUID; TanStack DB temp IDs use it.
let uuidCounter = 0;

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: {} as Crypto,
    writable: true,
  });
}

if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () => {
    const suffix = (uuidCounter++).toString(16).padStart(12, "0");
    return `00000000-0000-4000-8000-${suffix}`;
  };
}
