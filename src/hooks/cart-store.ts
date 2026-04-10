"use client";

import { type CartItem } from "@/types";

const CART_UPDATED_EVENT = "cart_updated";

interface CartUpdateEventDetail {
  userId: string;
}

interface CartSnapshot {
  raw: string | null;
  items: CartItem[];
}

const cartSnapshots = new Map<string, CartSnapshot>();
const EMPTY_CART_ITEMS: readonly CartItem[] = [];

function getCartStorageKey(userId: string) {
  return `cart_${userId}`;
}

function parseCartItems(raw: string | null, userId: string): CartItem[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error parsing cart items from localStorage", error, {
      userId,
    });
    return [];
  }
}

export function readCartItems(userId: string) {
  if (typeof window === "undefined") {
    return EMPTY_CART_ITEMS as CartItem[];
  }

  const key = getCartStorageKey(userId);
  const raw = window.localStorage.getItem(key);
  const cached = cartSnapshots.get(key);

  if (cached && cached.raw === raw) {
    return cached.items;
  }

  const items = parseCartItems(raw, userId);
  cartSnapshots.set(key, { raw, items });
  return items;
}

export function writeCartItems(userId: string, items: CartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  const key = getCartStorageKey(userId);
  const raw = JSON.stringify(items);

  try {
    window.localStorage.setItem(key, raw);
    cartSnapshots.set(key, { raw, items });
    window.dispatchEvent(
      new CustomEvent<CartUpdateEventDetail>(CART_UPDATED_EVENT, {
        detail: { userId },
      }),
    );
  } catch (error) {
    console.error("Error writing cart items to localStorage", error, {
      userId,
    });
  }
}

export function updateCartItems(
  userId: string,
  updater: (items: CartItem[]) => CartItem[],
) {
  const currentItems = readCartItems(userId);
  const nextItems = updater(currentItems);

  if (nextItems === currentItems) {
    return;
  }

  writeCartItems(userId, nextItems);
}

export function subscribeToCart(userId: string, onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => void 0;
  }

  const key = getCartStorageKey(userId);

  const handleCartUpdated = (event: Event) => {
    const detail = (event as CustomEvent<CartUpdateEventDetail>).detail;
    if (detail?.userId !== userId) {
      return;
    }

    cartSnapshots.delete(key);
    onStoreChange();
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key !== key) {
      return;
    }

    cartSnapshots.delete(key);
    onStoreChange();
  };

  window.addEventListener(CART_UPDATED_EVENT, handleCartUpdated as EventListener);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(
      CART_UPDATED_EVENT,
      handleCartUpdated as EventListener,
    );
    window.removeEventListener("storage", handleStorageEvent);
  };
}
