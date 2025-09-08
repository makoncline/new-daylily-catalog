"use client";

import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { type CartItem } from "@/types";
import { ShoppingCart, Check, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AddToCartButtonProps {
  listing: {
    id: string;
    title: string;
    price: number | null;
    userId: string;
  };
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function AddToCartButton({
  listing,
  variant = "secondary",
  className = "",
}: AddToCartButtonProps) {
  const { items, addItem } = useCart(listing.userId);
  const [isInCart, setIsInCart] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Check if this listing is already in the cart
  useEffect(() => {
    const itemInCart = items.find((item) => item.id === listing.id);
    setIsInCart(!!itemInCart);
  }, [items, listing.id]);

  const handleAddToCart = () => {
    setIsAdding(true);

    // Create the cart item
    const cartItem: CartItem = {
      id: listing.id,
      title: listing.title,
      price: listing.price,
      quantity: 1,
      listingId: listing.id,
      userId: listing.userId,
    };

    // Add to cart
    addItem(cartItem);

    // Show toast notification
    toast.success("Added to cart", {
      description: `${listing.title} has been added to your cart.`,
    });

    setTimeout(() => {
      setIsAdding(false);
    }, 1000);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size="sm"
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full px-2.5 transition-all",
              className,
            )}
            onClick={handleAddToCart}
            disabled={isAdding}
          >
            <ShoppingCart className="h-1 w-1" />
            <div className="h-3 w-px bg-current opacity-30" />
            {isInCart ? (
              <Check className="h-1 w-1" />
            ) : (
              <Plus className="h-1 w-1" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {isInCart ? "Already in cart" : "Add to cart"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
