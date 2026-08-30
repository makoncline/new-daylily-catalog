"use client";

import * as React from "react";

import { calculateShipping, type ShippingPolicy } from "@/lib/shipping";

export type CartProduct = {
  id: string;
  slug: string;
  title: string;
  price: number;
  imageUrl?: string;
  isForSale: boolean;
};

export type CartLine = CartProduct & {
  quantity: number;
};

type StoredCart = {
  version: 1;
  lines: CartLine[];
};

type CartContextValue = {
  isHydrated: boolean;
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  shipping: number;
  total: number;
  add: (product: CartProduct) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const CartContext = React.createContext<CartContextValue | null>(null);

function isStoredCart(value: unknown): value is StoredCart {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredCart>;
  return candidate.version === 1 && Array.isArray(candidate.lines);
}

export function CartProvider({
  children,
  siteKey,
  shippingPolicy,
}: {
  children: React.ReactNode;
  siteKey: string;
  shippingPolicy: ShippingPolicy;
}) {
  const [lines, setLines] = React.useState<CartLine[]>([]);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const storageKey = `storefront:${siteKey}:cart:v1`;

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isStoredCart(parsed)) {
          setLines(
            parsed.lines.filter(
              (line) =>
                line.isForSale &&
                Number.isFinite(line.price) &&
                line.price > 0 &&
                Number.isInteger(line.quantity) &&
                line.quantity > 0,
            ),
          );
        }
      }
    } catch {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Keep the in-memory cart available when browser storage is denied.
      }
    } finally {
      setIsHydrated(true);
    }
  }, [storageKey]);

  React.useEffect(() => {
    if (!isHydrated) return;
    const value: StoredCart = { version: 1, lines };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Keep the in-memory cart available when browser storage is unavailable.
    }
  }, [isHydrated, lines, storageKey]);

  const add = React.useCallback((product: CartProduct) => {
    if (
      !product.isForSale ||
      !Number.isFinite(product.price) ||
      product.price <= 0
    ) {
      throw new Error(
        "Only available listings with a valid price can be added.",
      );
    }
    setLines((current) => {
      const existing = current.find((line) => line.id === product.id);
      if (!existing) return [...current, { ...product, quantity: 1 }];
      return current.map((line) =>
        line.id === product.id
          ? { ...product, quantity: line.quantity + 1 }
          : line,
      );
    });
  }, []);

  const remove = React.useCallback((productId: string) => {
    setLines((current) => current.filter((line) => line.id !== productId));
  }, []);

  const setQuantity = React.useCallback(
    (productId: string, quantity: number) => {
      if (!Number.isInteger(quantity)) return;
      if (quantity <= 0) {
        setLines((current) => current.filter((line) => line.id !== productId));
        return;
      }
      setLines((current) =>
        current.map((line) =>
          line.id === productId ? { ...line, quantity } : line,
        ),
      );
    },
    [],
  );

  const clear = React.useCallback(() => setLines([]), []);
  const itemCount = lines.reduce((total, line) => total + line.quantity, 0);
  const subtotal = lines.reduce(
    (total, line) => total + line.price * line.quantity,
    0,
  );
  const shipping = calculateShipping(itemCount, shippingPolicy);

  const value = React.useMemo<CartContextValue>(
    () => ({
      isHydrated,
      lines,
      itemCount,
      subtotal,
      shipping,
      total: subtotal + shipping,
      add,
      setQuantity,
      remove,
      clear,
    }),
    [
      add,
      clear,
      isHydrated,
      itemCount,
      lines,
      remove,
      setQuantity,
      shipping,
      subtotal,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const cart = React.useContext(CartContext);
  if (!cart) throw new Error("useCart must be used inside CartProvider.");
  return cart;
}
