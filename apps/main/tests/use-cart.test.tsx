import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { writeCartItems } from "@/hooks/cart-store";
import { useCart } from "@/hooks/use-cart";
import type { CartItem } from "@/types";

const userId = "user-1";

const cartItem: CartItem = {
  id: "listing-1",
  title: "Daylily Listing",
  price: 14,
  quantity: 1,
  listingId: "listing-1",
  userId,
};

describe("useCart", () => {
  beforeEach(() => {
    writeCartItems(userId, []);
  });

  it("keeps multiple subscribers in sync", async () => {
    const first = renderHook(() => useCart(userId));
    const second = renderHook(() => useCart(userId));

    await waitFor(() => {
      expect(first.result.current.itemCount).toBe(0);
      expect(second.result.current.itemCount).toBe(0);
    });

    act(() => {
      first.result.current.addItem(cartItem);
    });

    await waitFor(() => {
      expect(first.result.current.itemCount).toBe(1);
      expect(second.result.current.itemCount).toBe(1);
      expect(first.result.current.total).toBe(14);
      expect(second.result.current.total).toBe(14);
    });

    act(() => {
      first.result.current.updateQuantity(cartItem.id, 3);
    });

    await waitFor(() => {
      expect(first.result.current.itemCount).toBe(3);
      expect(second.result.current.itemCount).toBe(3);
      expect(first.result.current.total).toBe(42);
      expect(second.result.current.total).toBe(42);
    });

    act(() => {
      first.result.current.clearCart();
    });

    await waitFor(() => {
      expect(first.result.current.items).toEqual([]);
      expect(second.result.current.items).toEqual([]);
    });
  });
});
