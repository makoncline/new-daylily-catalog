"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { usePro } from "@/hooks/use-pro";
import { type ButtonProps } from "@/components/ui/button";

interface CheckoutButtonProps
  extends Omit<ButtonProps, "onClick" | "disabled"> {
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
      <Sparkles className="mr-2 h-4 w-4" />
      {children ?? (isPending ? "Loading..." : "Upgrade to Pro")}
    </Button>
  );
}
