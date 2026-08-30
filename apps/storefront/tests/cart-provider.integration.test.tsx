// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CartProvider, useCart } from "@/components/cart/cart-provider";
import { CartPageClient } from "@/components/cart/cart-page-client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function CartState() {
  const cart = useCart();
  return <p>{cart.isHydrated ? "Cart ready" : "Cart loading"}</p>;
}

function CartControls() {
  const cart = useCart();
  const product = {
    id: "listing-1",
    slug: "fixture-daylily",
    title: "Fixture daylily",
    price: 12,
    isForSale: true,
  };

  return (
    <>
      <output>{cart.lines[0]?.quantity ?? 0}</output>
      <button type="button" onClick={() => cart.add(product)}>
        Add
      </button>
      <button type="button" onClick={() => cart.setQuantity(product.id, 100)}>
        Set maximum
      </button>
      <button type="button" onClick={() => cart.setQuantity(product.id, 101)}>
        Set above maximum
      </button>
    </>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
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

  it("keeps cart state within the inquiry quantity contract", async () => {
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
          <CartControls />
        </CartProvider>,
      );
    });

    const buttons = Array.from(container.querySelectorAll("button"));
    await act(async () => buttons[0]?.click());
    expect(container.querySelector("output")?.textContent).toBe("1");

    await act(async () => buttons[1]?.click());
    expect(container.querySelector("output")?.textContent).toBe("100");

    await act(async () => buttons[0]?.click());
    await act(async () => buttons[2]?.click());
    expect(container.querySelector("output")?.textContent).toBe("100");

    await act(async () => root.unmount());
  });

  it("disables the cart increment button at the inquiry maximum", async () => {
    window.localStorage.setItem(
      "storefront:fixture:cart:v1",
      JSON.stringify({
        version: 1,
        lines: [
          {
            id: "listing-1",
            slug: "fixture-daylily",
            title: "Fixture daylily",
            price: 12,
            isForSale: true,
            quantity: 100,
          },
        ],
      }),
    );
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
          <CartPageClient minimumOrder={0} />
        </CartProvider>,
      );
    });

    const increment = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Add one Fixture daylily"]',
    );
    expect(increment?.disabled).toBe(true);

    await act(async () => root.unmount());
  });
});
