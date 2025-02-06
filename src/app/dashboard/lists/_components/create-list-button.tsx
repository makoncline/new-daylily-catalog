"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import { APP_CONFIG, PRO_FEATURES } from "@/config/constants";
import { usePro } from "@/hooks/use-pro";
import { CheckoutButton } from "@/components/checkout-button";
import { useEditList } from "./edit-list-dialog";

export function CreateListButton() {
  const { editList } = useEditList();
  const { toast } = useToast();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { isPro } = usePro();

  const { data: listCount } = api.list.count.useQuery();

  const createList = api.list.create.useMutation({
    onError: () => {
      toast({
        title: "Failed to create list",
        variant: "destructive",
      });
    },
  });

  const handleCreate = async () => {
    // Check if user is on free tier and has reached the limit
    const reachedLimit =
      !isPro && (listCount ?? 0) >= APP_CONFIG.LIST.FREE_TIER_MAX_LISTS;

    if (reachedLimit) {
      setShowUpgradeDialog(true);
      return;
    }

    try {
      const list = await createList.mutateAsync({
        title: "New List",
        description: "",
      });
      editList(list.id);
    } catch {
      // Error is already handled by the mutation's onError
    }
  };

  return (
    <>
      <Button onClick={handleCreate} disabled={createList.isPending}>
        <Plus className="mr-2 h-4 w-4" />
        {createList.isPending ? "Creating..." : "Create List"}
      </Button>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upgrade to Pro</DialogTitle>
            <DialogDescription>
              You&apos;ve reached the free tier limit of{" "}
              {APP_CONFIG.LIST.FREE_TIER_MAX_LISTS} list. Upgrade to Pro for
              unlimited lists and more features.
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

            <CheckoutButton size="lg" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
