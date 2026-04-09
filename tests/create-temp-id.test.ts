// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { createTempId } from "@/lib/utils/create-temp-id";

const originalCrypto = globalThis.crypto;

afterEach(() => {
  Object.defineProperty(globalThis, "crypto", {
    value: originalCrypto,
    configurable: true,
  });
  vi.restoreAllMocks();
});

describe("createTempId", () => {
  it("uses crypto.randomUUID when available", () => {
    Object.defineProperty(globalThis, "crypto", {
      value: {
        randomUUID: vi.fn(() => "uuid-from-randomUUID"),
      },
      configurable: true,
    });

    expect(createTempId()).toBe("temp:uuid-from-randomUUID");
  });

  it("falls back when crypto.randomUUID is unavailable", () => {
    Object.defineProperty(globalThis, "crypto", {
      value: undefined,
      configurable: true,
    });

    const tempId = createTempId("custom");

    expect(tempId).toMatch(/^custom:/);
    expect(tempId).not.toBe("custom:");
  });
});
