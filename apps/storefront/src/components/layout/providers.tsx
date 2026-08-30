"use client";

import { Toaster } from "@daylily-catalog/ui/components/sonner";

import { CartProvider } from "@/components/cart/cart-provider";

interface ProvidersProps {
  children: React.ReactNode;
  siteKey: string;
  shippingPolicy: {
    baseItems: number;
    baseRate: number;
    additionalItemRate: number;
  };
}

export function Providers({
  children,
  siteKey,
  shippingPolicy,
}: ProvidersProps) {
  return (
    <CartProvider siteKey={siteKey} shippingPolicy={shippingPolicy}>
      {children}
      <Toaster position="bottom-right" />
    </CartProvider>
  );
}
