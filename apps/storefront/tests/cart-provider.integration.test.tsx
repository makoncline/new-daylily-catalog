// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CartProvider, useCart } from "@/components/cart/cart-provider";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function CartState() {
  const cart = useCart();
  return <p>{cart.isHydrated ? "Cart ready" : "Cart loading"}</p>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cart browser storage", () => {
  it("keeps the in-memory cart ready when browser storage is denied", async () => {
    const storageError = new DOMException("Storage denied", "SecurityError");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw storageError;
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw storageError;
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw storageError;
    });
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <CartProvider
          siteKey="fixture"
          shippingPolicy={{
            baseItems: 3,
            baseRate: 15,
            additionalItemRate: 1.5,
          }}
        >
          <CartState />
        </CartProvider>,
      );
    });

    expect(container.textContent).toBe("Cart ready");
    await act(async () => root.unmount());
  });
});
