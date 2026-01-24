"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCart } from "@/hooks/use-cart";
import { useCustomerInfo } from "@/hooks/use-customer-info";
import {
  type CartItem,
  type ContactFormWithCartData,
  contactFormWithCartSchema,
} from "@/types";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, MinusCircle, PlusCircle, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getErrorMessage, normalizeError } from "@/lib/error-utils";

interface ContactFormProps {
  userId: string;
  onSubmitSuccess?: () => void;
}

export function ContactForm({ userId, onSubmitSuccess }: ContactFormProps) {
  const { items, updateQuantity, removeItem, clearCart, total } =
    useCart(userId);
  const { customerInfo, updateCustomerInfo } = useCustomerInfo();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClearCartDialog, setShowClearCartDialog] = useState(false);
  const hasItems = items.length > 0;

  const sendMessage = api.public.sendMessage.useMutation({
    onSuccess: () => {
      toast.success("Message sent", {
        description: "Your message has been sent successfully.",
      });

      // Show dialog if cart has items
      if (items.length > 0) {
        setShowClearCartDialog(true);
      } else if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    },
    onError: (error, errorInfo) => {
      toast.error("Error sending message", {
        description: getErrorMessage(error),
      });
      reportError({
        error: normalizeError(error),
        context: { source: "ContactForm", errorInfo },
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const form = useForm<ContactFormWithCartData>({
    resolver: zodResolver(contactFormWithCartSchema),
    defaultValues: {
      email: customerInfo.email ?? "",
      name: customerInfo.name ?? "",
      message: "",
      userId,
      hasItems,
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  // Get formState to check form validity
  const { formState } = form;

  // Update form when customerInfo changes (on initial load)
  useEffect(() => {
    if (customerInfo.email) {
      form.setValue("email", customerInfo.email);
    }
    if (customerInfo.name) {
      form.setValue("name", customerInfo.name);
    }
  }, [customerInfo, form]);

  // Update form when cart items change
  useEffect(() => {
    form.setValue("hasItems", items.length > 0, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [items.length, form]);

  const onSubmit = (data: ContactFormWithCartData) => {
    setIsSubmitting(true);

    // Save customer info to local storage
    updateCustomerInfo({
      email: data.email,
      name: data.name ?? "",
    });

    // Format cart items for the message
    let formattedMessage = data.message ?? "";

    if (items.length > 0) {
      formattedMessage += "\n\n--- Cart Items ---\n";
      items.forEach((item) => {
        formattedMessage += `\n${item.quantity}x ${item.title}`;
        if (item.price) {
          formattedMessage += ` (${formatPrice(item.price)} each)`;
        }
      });
      formattedMessage += `\n\nSubtotal: ${formatPrice(total)}`;
      formattedMessage +=
        "\n\nNote: Final pricing, shipping, and handling may vary at the discretion of the seller.";
    }

    // Send the message
    sendMessage.mutate({
      userId: data.userId,
      customerEmail: data.email,
      customerName: data.name ?? "",
      message: formattedMessage,
      items: items,
    });
  };

  const handleKeepCart = () => {
    setShowClearCartDialog(false);
    if (onSubmitSuccess) {
      onSubmitSuccess();
    }
  };

  const handleClearCart = () => {
    clearCart();
    setShowClearCartDialog(false);
    if (onSubmitSuccess) {
      onSubmitSuccess();
    }
  };

  return (
    <>
      <div className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="your@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your message here"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {items.length > 0 && (
              <div className="border-border rounded-md border p-4">
                <h3 className="mb-2 font-medium">Cart Items</h3>
                <div className="space-y-3">
                  {items.map((item) => (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      onQuantityChange={updateQuantity}
                      onRemove={removeItem}
                    />
                  ))}
                  <div className="border-border flex items-center justify-between border-t pt-2">
                    <span className="font-medium">Subtotal:</span>
                    <span className="font-medium">{formatPrice(total)}</span>
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    This is an estimated subtotal. Final pricing, shipping, and
                    handling costs may vary and will be determined by the
                    seller.
                  </p>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !formState.isValid}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Message"
              )}
            </Button>
          </form>
        </Form>
      </div>

      <AlertDialog
        open={showClearCartDialog}
        onOpenChange={setShowClearCartDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Your message has been sent</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to clear your cart or keep these items for later?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleKeepCart}>
              Keep Cart
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleClearCart}>
              Clear Cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface CartItemRowProps {
  item: CartItem;
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

function CartItemRow({ item, onQuantityChange, onRemove }: CartItemRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="font-medium">{item.title}</p>
        {item.price && (
          <p className="text-muted-foreground text-sm">
            {formatPrice(item.price)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onQuantityChange(item.id, item.quantity - 1)}
        >
          <MinusCircle className="h-4 w-4" />
        </Button>

        <span className="w-6 text-center">{item.quantity}</span>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onQuantityChange(item.id, item.quantity + 1)}
        >
          <PlusCircle className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="ml-2 h-7 w-7"
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
