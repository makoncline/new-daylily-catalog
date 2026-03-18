"use client";

import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ManagedCreateDialogProps {
  bodyClassName?: string;
  cancelDisabled?: boolean;
  children: ReactNode;
  confirmDisabled?: boolean;
  confirmLabel: ReactNode;
  contentClassName?: string;
  description: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: ReactNode;
}

export function ManagedCreateDialog({
  bodyClassName = "space-y-4 py-4",
  cancelDisabled,
  children,
  confirmDisabled,
  confirmLabel,
  contentClassName,
  description,
  onCancel,
  onConfirm,
  onOpenChange,
  open,
  title,
}: ManagedCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className={bodyClassName}>{children}</div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={cancelDisabled}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
