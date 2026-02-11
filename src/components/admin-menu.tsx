"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function getShortcutLabel() {
  if (typeof navigator === "undefined") {
    return "Cmd+Option+X";
  }

  return /Mac/i.test(navigator.platform) ? "Cmd+Option+X" : "Ctrl+Alt+X";
}

export function AdminMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const shortcutLabel = useMemo(() => getShortcutLabel(), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isShortcutKey =
        (event.metaKey || event.ctrlKey) &&
        event.altKey &&
        event.code === "KeyX";

      if (!isShortcutKey) {
        return;
      }

      event.preventDefault();
      setIsOpen((previous) => !previous);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Admin Menu</DialogTitle>
          <DialogDescription>
            Secret admin menu shortcut: {shortcutLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="text-muted-foreground text-sm">
          No active experimental flags in this build.
        </div>
      </DialogContent>
    </Dialog>
  );
}
