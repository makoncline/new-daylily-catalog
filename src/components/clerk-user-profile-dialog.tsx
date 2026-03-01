"use client";

import { useEffect, useState } from "react";
import { UserProfile } from "@clerk/nextjs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { atom, useAtom } from "jotai";

export const isClerkUserProfileOpenAtom = atom(false);

export function ClerkUserProfileDialog() {
  const [isOpen, setIsOpen] = useAtom(isClerkUserProfileOpenAtom);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
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
