"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { usePro } from "@/hooks/use-pro";

interface CheckoutButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "onClick" | "disabled"> {
  children?: React.ReactNode;
  checkoutSource?: string;
}

export function CheckoutButton({
  children,
  checkoutSource,
  variant = "gradient",
  ...props
}: CheckoutButtonProps) {
  const { isPending, sendToCheckout } = usePro();

  return (
    <Button
      variant={variant}
      type="button"
      onClick={() => void sendToCheckout(checkoutSource)}
      disabled={isPending}
      {...props}
    >
      <Sparkles className="mr-2 h-4 w-4" />
      {children ?? (isPending ? "Loading..." : "Upgrade to Pro")}
    </Button>
  );
}
