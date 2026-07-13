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

interface TierLimitedCreateActionProps {
  buttonLabel: string;
  buttonTestId?: string;
  currentCount?: number;
  freeTierLimit: number;
  isPro: boolean;
  upgradeDialogBody: ReactNode;
  upgradeDialogClassName?: string;
  upgradeDialogDescription: ReactNode;
  upgradeDialogTitle: string;
  renderCreateDialog: (onOpenChange: (open: boolean) => void) => ReactNode;
  createDialogOpen?: boolean;
  onCreateDialogOpenChange?: (open: boolean) => void;
}

export function TierLimitedCreateAction({
  buttonLabel,
  buttonTestId,
  currentCount,
  freeTierLimit,
  isPro,
  upgradeDialogBody,
  upgradeDialogClassName,
  upgradeDialogDescription,
  upgradeDialogTitle,
  renderCreateDialog,
  createDialogOpen,
  onCreateDialogOpenChange,
}: TierLimitedCreateActionProps) {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const reachedLimit = !isPro && (currentCount ?? 0) >= freeTierLimit;
  const controlledUpgradeOpen = createDialogOpen === true && reachedLimit;
  const isCreateDialogOpen =
    (createDialogOpen ?? showCreateDialog) && !reachedLimit;
  const setCreateDialogOpen = onCreateDialogOpenChange ?? setShowCreateDialog;

  const handleCreateClick = () => {
    if (reachedLimit) {
      setShowUpgradeDialog(true);
      return;
    }

    setCreateDialogOpen(true);
  };

  return (
    <>
      <Button onClick={handleCreateClick} data-testid={buttonTestId}>
        <Plus className="mr-2 size-4" />
        {buttonLabel}
      </Button>

      <Dialog
        open={showUpgradeDialog || controlledUpgradeOpen}
        onOpenChange={(open) => {
          setShowUpgradeDialog(open);
          if (!open && controlledUpgradeOpen) setCreateDialogOpen(false);
        }}
      >
        <DialogContent className={upgradeDialogClassName}>
          <DialogHeader>
            <DialogTitle>{upgradeDialogTitle}</DialogTitle>
            <DialogDescription>{upgradeDialogDescription}</DialogDescription>
          </DialogHeader>
          {upgradeDialogBody}
        </DialogContent>
      </Dialog>

      {isCreateDialogOpen &&
        renderCreateDialog((open) => {
          if (!open) {
            setCreateDialogOpen(false);
          }
        })}
    </>
  );
}
