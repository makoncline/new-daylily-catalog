"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { usePro } from "@/hooks/use-pro";

interface CheckoutButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "onClick" | "disabled"> {
  children?: React.ReactNode;
}

export function CheckoutButton({
  children,
  variant = "gradient",
  ...props
}: CheckoutButtonProps) {
  const { isPending, sendToCheckout } = usePro();

  return (
    <Button
      variant={variant}
      type="button"
      onClick={() => void sendToCheckout()}
      disabled={isPending}
      {...props}
    >
      <Sparkles className="mr-2 size-4" />
      {children ??
        (isPending
          ? "Loading..."
          : SUBSCRIPTION_CONFIG.COPY.CTA.UPGRADE_TO_PRO)}
    </Button>
  );
}
