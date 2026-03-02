"use client";

import { UserProfile } from "@clerk/nextjs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { atom, useAtom } from "jotai";

export const isClerkUserProfileOpenAtom = atom(false);

export function ClerkUserProfileDialog() {
  const [isOpen, setIsOpen] = useAtom(isClerkUserProfileOpenAtom);
  const isHydrated = useIsHydrated();

  if (!isHydrated) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-max p-0">
        <DialogTitle className="sr-only">User Account</DialogTitle>
        <UserProfile routing="hash" />
      </DialogContent>
    </Dialog>
  );
}
