"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { H3 } from "@/components/typography";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/trpc/react";
import { useEditListing } from "./edit-listing-dialog";
import { APP_CONFIG, PRO_FEATURES } from "@/config/constants";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";

export function CreateListingButton() {
  const router = useRouter();
  const { editListing } = useEditListing();
  const { toast } = useToast();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const { data: subscription } = api.stripe.getSubscription.useQuery();
  const { data: listingCount } = api.listing.count.useQuery();
  const generateCheckout = api.stripe.generateCheckout.useMutation();

  const createListing = api.listing.create.useMutation({
    onError: () => {
      toast({
        title: "Failed to create listing",
        variant: "destructive",
      });
    },
  });

  const handleCreate = async () => {
    // Check if user is on free tier and has reached the limit
    const isPro = hasActiveSubscription(subscription?.status);
    const reachedLimit =
      !isPro &&
      (listingCount ?? 0) >= APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS;

    if (reachedLimit) {
      setShowUpgradeDialog(true);
      return;
    }

    try {
      const listing = await createListing.mutateAsync();
      editListing(listing.id);
    } catch {
      // Error is already handled by the mutation's onError
    }
  };

  const handleUpgrade = async () => {
    try {
      const { url } = await generateCheckout.mutateAsync();
      router.push(url);
    } catch (error) {
      console.error("Failed to create checkout session", error);
      toast({
        title: "Failed to start checkout",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Button onClick={handleCreate} disabled={createListing.isPending}>
        <Plus className="mr-2 h-4 w-4" />
        {createListing.isPending ? "Creating..." : "Create Listing"}
      </Button>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upgrade to Pro</DialogTitle>
            <DialogDescription>
              You&apos;ve reached the free tier limit of{" "}
              {APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS} listings. Upgrade to
              Pro for unlimited listings and more features.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <H3 className="text-xl">Pro Features</H3>
              <ul className="space-y-2 text-sm">
                {PRO_FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <li key={feature.id} className="flex items-center">
                      <Icon className="mr-2 h-4 w-4" />
                      {feature.text}
                    </li>
                  );
                })}
              </ul>
            </div>

            <Button
              size="lg"
              variant="gradient"
              onClick={handleUpgrade}
              disabled={generateCheckout.isPending}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {generateCheckout.isPending ? "Loading..." : "Upgrade to Pro"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
