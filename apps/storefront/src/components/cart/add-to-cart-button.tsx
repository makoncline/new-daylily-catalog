"use client";

import { Button } from "@daylily-catalog/ui/components/button";
import { ShoppingCart } from "lucide-react";
import * as React from "react";

import { type CartProduct, useCart } from "./cart-provider";

export function AddToCartButton({ product }: { product: CartProduct }) {
  const { add } = useCart();
  const [message, setMessage] = React.useState("");

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        onClick={() => {
          add(product);
          setMessage(`${product.title} was added to your cart.`);
        }}
      >
        <ShoppingCart data-icon="inline-start" aria-hidden="true" />
        Add to cart
      </Button>
      <p className="text-muted-foreground min-h-5 text-sm" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
