"use client";

import { type ReactNode, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CreateActionBehavior =
  | {
      onCreate: () => void;
      renderCreateDialog?: never;
    }
  | {
      onCreate?: never;
      renderCreateDialog: (onOpenChange: (open: boolean) => void) => ReactNode;
    };

type TierLimitedCreateActionProps = {
  buttonLabel: string;
  buttonTestId?: string;
  currentCount?: number;
  freeTierLimit: number;
  isPro: boolean;
  upgradeDialogBody: ReactNode;
  upgradeDialogClassName?: string;
  upgradeDialogDescription: ReactNode;
  upgradeDialogTitle: string;
} & CreateActionBehavior;

export function TierLimitedCreateAction({
  buttonLabel,
  buttonTestId,
  currentCount,
  freeTierLimit,
  isPro,
  onCreate,
  upgradeDialogBody,
  upgradeDialogClassName,
  upgradeDialogDescription,
  upgradeDialogTitle,
  renderCreateDialog,
}: TierLimitedCreateActionProps) {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleCreateClick = () => {
    const reachedLimit = !isPro && (currentCount ?? 0) >= freeTierLimit;

    if (reachedLimit) {
      setShowUpgradeDialog(true);
      return;
    }

    if (onCreate) {
      onCreate();
      return;
    }

    setShowCreateDialog(true);
  };

  return (
    <>
      <Button onClick={handleCreateClick} data-testid={buttonTestId}>
        <Plus className="mr-2 size-4" />
        {buttonLabel}
      </Button>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className={upgradeDialogClassName}>
          <DialogHeader>
            <DialogTitle>{upgradeDialogTitle}</DialogTitle>
            <DialogDescription>{upgradeDialogDescription}</DialogDescription>
          </DialogHeader>
          {upgradeDialogBody}
        </DialogContent>
      </Dialog>

      {showCreateDialog &&
        renderCreateDialog?.((open) => {
          if (!open) {
            setShowCreateDialog(false);
          }
        })}
    </>
  );
}
