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
import { ClientOnly } from "@/components/client-only";

interface FloatingCartButtonProps {
  userId: string;
  userName?: string;
  showTopButton?: boolean;
}

export function FloatingCartButton({
  userId,
  userName,
  showTopButton = false,
}: FloatingCartButtonProps) {
  const { itemCount } = useCart(userId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fallback = (
    <>
      {showTopButton && (
        <Button type="button" className="w-full sm:w-auto" disabled>
          <MessageCircle className="h-4 w-4" />
          <span>Contact Seller</span>
        </Button>
      )}

      <Button
        type="button"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full shadow-md"
        variant="default"
        aria-label="Contact seller"
        disabled
      >
        <MessageCircle className="h-5 w-5" />
      </Button>
    </>
  );

  return (
    <ClientOnly fallback={fallback}>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {showTopButton && (
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => setIsDialogOpen(true)}
          >
            <MessageCircle className="h-4 w-4" />
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
            className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full shadow-md"
            variant="default"
            aria-label={
              itemCount > 0
                ? `Contact seller and view cart (${itemCount} ${itemCount === 1 ? "item" : "items"})`
                : "Contact seller"
            }
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
    </ClientOnly>
  );
}
