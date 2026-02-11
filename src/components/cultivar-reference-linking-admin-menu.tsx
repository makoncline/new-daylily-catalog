"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getCultivarReferenceLinkingEnvDefault,
  getCultivarReferenceLinkingOverride,
  setCultivarReferenceLinkingOverride,
} from "@/lib/cultivar-reference-linking";

function getShortcutLabel() {
  if (typeof navigator === "undefined") {
    return "Cmd+Option+X";
  }

  return /Mac/i.test(navigator.platform) ? "Cmd+Option+X" : "Ctrl+Alt+X";
}

export function CultivarReferenceLinkingAdminMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [override, setOverride] = useState<boolean | null>(null);
  const envDefault = getCultivarReferenceLinkingEnvDefault();

  const shortcutLabel = useMemo(() => getShortcutLabel(), []);

  const effectiveValue = override ?? envDefault;
  const sourceLabel = override === null ? "env default" : "session override";

  const refreshOverride = () => {
    setOverride(getCultivarReferenceLinkingOverride());
  };

  useEffect(() => {
    refreshOverride();
  }, []);

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
      refreshOverride();
      setIsOpen((previous) => !previous);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const applyOverride = (value: boolean | null) => {
    setCultivarReferenceLinkingOverride(value);
    setOverride(value);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) {
          refreshOverride();
        }
        setIsOpen(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Feature Flags</DialogTitle>
          <DialogDescription>
            Secret menu shortcut: {shortcutLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">
              Cultivar Reference Linking
            </div>
            <div className="flex gap-2">
              <Badge variant={effectiveValue ? "default" : "secondary"}>
                Effective: {effectiveValue ? "ON" : "OFF"}
              </Badge>
              <Badge variant="outline">Source: {sourceLabel}</Badge>
            </div>
            <div className="text-muted-foreground text-xs">
              Env default: {envDefault ? "ON" : "OFF"}
            </div>
            <div className="text-muted-foreground text-xs">
              Session override affects client display/search/link flows only.
              Server-only outputs still use the env default.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => applyOverride(true)}>
              Force ON
            </Button>
            <Button type="button" onClick={() => applyOverride(false)}>
              Force OFF
            </Button>
            <Button type="button" variant="outline" onClick={() => applyOverride(null)}>
              Use Env Default
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
