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
  showTopButton?: boolean;
  onContactClick?: () => void;
}

export function FloatingCartButton({
  userId,
  userName,
  showTopButton = false,
  onContactClick,
}: FloatingCartButtonProps) {
  const { itemCount } = useCart(userId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      {showTopButton && (
        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={() => {
            onContactClick?.();
            setIsDialogOpen(true);
          }}
        >
          <MessageCircle className="size-4" />
          <span>
            Contact Seller
            {itemCount > 0 &&
              ` (${itemCount} ${itemCount === 1 ? "item" : "items"})`}
          </span>
        </Button>
      )}

      <DialogTrigger asChild>
        <Button
          type="button"
          className="fixed right-4 bottom-[calc(2.5rem+env(safe-area-inset-bottom))] z-50 flex items-center gap-2 rounded-full shadow-md"
          variant="default"
          onClick={onContactClick}
          aria-label={
            itemCount > 0
              ? `Contact seller and view cart (${itemCount} ${itemCount === 1 ? "item" : "items"})`
              : "Contact seller"
          }
        >
          {itemCount > 0 ? (
            <>
              <ShoppingCart className="size-5" />
              <div className="bg-primary-foreground/30 h-4 w-px" />
              <span>{itemCount > 99 ? "99+" : itemCount}</span>
            </>
          ) : (
            <MessageCircle className="size-5" />
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
