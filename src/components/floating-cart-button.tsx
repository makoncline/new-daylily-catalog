"use client";

import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ShoppingCart, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { useState } from "react";

interface FloatingCartButtonProps {
  userId: string;
  userName?: string;
}

export function FloatingCartButton({
  userId,
  userName,
}: FloatingCartButtonProps) {
  const { itemCount } = useCart(userId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full shadow-md"
          variant="default"
        >
          {itemCount > 0 ? (
            <>
              <ShoppingCart className="h-5 w-5" />
              <div className="h-4 w-px bg-primary-foreground/30" />
              <span>{itemCount > 99 ? "99+" : itemCount}</span>
            </>
          ) : (
            <MessageCircle className="h-5 w-5" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogTitle>
          Contact {userName ?? "User"}
          {itemCount > 0 &&
            ` (${itemCount} ${itemCount === 1 ? "item" : "items"} in cart)`}
        </DialogTitle>
        <ContactForm
          userId={userId}
          onSubmitSuccess={() => setIsDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
