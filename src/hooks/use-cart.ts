"use client";

import { useLocalStorage } from "@/hooks/use-local-storage";
import { type CartItem } from "@/types";
import { useEffect, useMemo } from "react";

// Create a custom event name for cart updates
const CART_UPDATED_EVENT = "cart_updated";

// Define the custom event detail type
interface CartUpdateEventDetail {
  userId: string;
}

/**
 * Hook to manage a cart for a specific grower
 * @param userId - The ID of the user
 * @returns Cart items and functions to manipulate the cart
 */
export function useCart(userId: string) {
  const [items, setItems] = useLocalStorage<CartItem[]>(`cart_${userId}`, []);
  const itemCount = useMemo(
    () => items.reduce((count, item) => count + item.quantity, 0),
    [items],
  );
  const total = useMemo(
    () => items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0),
    [items],
  );

  // Listen for cart update events from other components
  useEffect(() => {
    const handleCartUpdated = (event: CustomEvent<CartUpdateEventDetail>) => {
      if (event.detail?.userId === userId) {
        // Force recalculation from localStorage
        const storedItems = localStorage.getItem(`cart_${userId}`);
        if (storedItems) {
          try {
            const parsedItems = JSON.parse(storedItems) as CartItem[];
            setItems(parsedItems);
          } catch (error) {
            console.error("Error parsing cart items from localStorage", error);
          }
        }
      }
    };

    window.addEventListener(
      CART_UPDATED_EVENT,
      handleCartUpdated as EventListener,
    );

    return () => {
      window.removeEventListener(
        CART_UPDATED_EVENT,
        handleCartUpdated as EventListener,
      );
    };
  }, [userId, setItems]);

  // Function to dispatch cart updated event
  const broadcastCartUpdated = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<CartUpdateEventDetail>(CART_UPDATED_EVENT, {
          detail: { userId },
        }),
      );
    }
  };

  /**
   * Add an item to the cart
   * @param item - The item to add
   */
  const addItem = (item: CartItem) => {
    setItems((prevItems) => {
      // Check if the item already exists in the cart
      const existingItemIndex = prevItems.findIndex((i) => i.id === item.id);

      let updatedItems;
      if (existingItemIndex >= 0) {
        // If item exists, increment the quantity
        updatedItems = [...prevItems];
        const existingItem = updatedItems[existingItemIndex];
        if (existingItem) {
          updatedItems[existingItemIndex] = {
            ...existingItem,
            quantity: existingItem.quantity + 1,
          };
        }
      } else {
        // Otherwise, add the new item
        updatedItems = [...prevItems, item];
      }

      // Broadcast the update
      setTimeout(broadcastCartUpdated, 0);

      return updatedItems;
    });
  };

  /**
   * Remove an item from the cart
   * @param itemId - The ID of the item to remove
   */
  const removeItem = (itemId: string) => {
    setItems((prevItems) => {
      const updatedItems = prevItems.filter((item) => item.id !== itemId);

      // Broadcast the update
      setTimeout(broadcastCartUpdated, 0);

      return updatedItems;
    });
  };

  /**
   * Update the quantity of an item in the cart
   * @param itemId - The ID of the item to update
   * @param quantity - The new quantity
   */
  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setItems((prevItems) => {
      const updatedItems = prevItems.map((item) =>
        item.id === itemId ? { ...item, quantity } : item,
      );

      // Broadcast the update
      setTimeout(broadcastCartUpdated, 0);

      return updatedItems;
    });
  };

  /**
   * Clear all items from the cart
   */
  const clearCart = () => {
    setItems([]);

    // Broadcast the update
    setTimeout(broadcastCartUpdated, 0);
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
