"use client";

import { UserProfile } from "@clerk/nextjs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { atom, useAtom } from "jotai";

export const isClerkUserProfileOpenAtom = atom(false);

export function ClerkUserProfileDialog() {
  const [isOpen, setIsOpen] = useAtom(isClerkUserProfileOpenAtom);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTitle hidden>User Account</DialogTitle>
      <DialogContent className="max-w-max p-0">
        <UserProfile routing="hash" />
      </DialogContent>
    </Dialog>
  );
}
