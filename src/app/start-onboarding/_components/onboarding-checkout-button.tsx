"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { normalizeError, reportError } from "@/lib/error-utils";

interface OnboardingCheckoutButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "onClick" | "disabled"> {
  children?: React.ReactNode;
  source: string;
}

export function OnboardingCheckoutButton({
  children,
  source,
  variant = "gradient",
  ...props
}: OnboardingCheckoutButtonProps) {
  const router = useRouter();
  const generateCheckout = api.stripe.generateCheckout.useMutation();

  const handleCheckout = async () => {
    capturePosthogEvent("checkout_started", { source });

    try {
      const { url } = await generateCheckout.mutateAsync();
      capturePosthogEvent("checkout_redirect_ready", { source });
      router.push(url);
    } catch (error) {
      capturePosthogEvent("checkout_failed", { source });
      reportError({
        error: normalizeError(error),
        context: { action: "onboardingSendToCheckout", source },
      });
    }
  };

  return (
    <Button
      variant={variant}
      type="button"
      onClick={() => void handleCheckout()}
      disabled={generateCheckout.isPending}
      {...props}
    >
      <Sparkles className="mr-2 h-4 w-4" />
      {children ??
        (generateCheckout.isPending ? "Loading..." : "Upgrade to Pro")}
    </Button>
  );
}
