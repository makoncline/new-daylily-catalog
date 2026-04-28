"use client";

import { type CartItem } from "@/types";
import { useMemo, useSyncExternalStore } from "react";
import {
  readCartItems,
  subscribeToCart,
  updateCartItems,
  writeCartItems,
} from "@/hooks/cart-store";

const EMPTY_CART_ITEMS: readonly CartItem[] = [];

export function useCart(userId: string) {
  const items = useSyncExternalStore(
    (onStoreChange) => subscribeToCart(userId, onStoreChange),
    () => readCartItems(userId),
    () => EMPTY_CART_ITEMS as CartItem[],
  );

  const itemCount = useMemo(
    () => items.reduce((count, item) => count + item.quantity, 0),
    [items],
  );
  const total = useMemo(
    () => items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0),
    [items],
  );

  const addItem = (item: CartItem) => {
    updateCartItems(userId, (prevItems) => {
      const existingItemIndex = prevItems.findIndex((i) => i.id === item.id);

      if (existingItemIndex >= 0) {
        return prevItems.map((existingItem, index) =>
          index === existingItemIndex
            ? { ...existingItem, quantity: existingItem.quantity + 1 }
            : existingItem,
        );
      }

      return [...prevItems, item];
    });
  };

  const removeItem = (itemId: string) => {
    updateCartItems(userId, (prevItems) => {
      const nextItems = prevItems.filter((item) => item.id !== itemId);
      if (nextItems.length === prevItems.length) {
        return prevItems;
      }

      return nextItems;
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    updateCartItems(userId, (prevItems) => {
      let didChange = false;
      const nextItems = prevItems.map((item) => {
        if (item.id !== itemId || item.quantity === quantity) {
          return item;
        }

        didChange = true;
        return { ...item, quantity };
      });

      return didChange ? nextItems : prevItems;
    });
  };

  const clearCart = () => {
    writeCartItems(userId, []);
  };

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    itemCount,
    total,
  };
}
