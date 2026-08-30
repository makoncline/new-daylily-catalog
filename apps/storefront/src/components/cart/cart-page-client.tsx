"use client";

import { Button } from "@daylily-catalog/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@daylily-catalog/ui/components/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@daylily-catalog/ui/components/field";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
} from "@daylily-catalog/ui/components/empty";
import { Input } from "@daylily-catalog/ui/components/input";
import { Separator } from "@daylily-catalog/ui/components/separator";
import { Spinner } from "@daylily-catalog/ui/components/spinner";
import { Textarea } from "@daylily-catalog/ui/components/textarea";
import { Minus, Plus, Send, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { formatCurrency } from "@/lib/format";

import { canIncrementCartQuantity, useCart } from "./cart-provider";

export function CartPageClient({ minimumOrder }: { minimumOrder: number }) {
  const cart = useCart();
  const router = useRouter();
  const openedAt = React.useRef(new Date().toISOString());
  const emptyHeadingRef = React.useRef<HTMLHeadingElement>(null);
  const focusControls = React.useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = React.useRef<
    `decrement:${string}` | `remove:${string}` | "empty" | null
  >(null);
  const [status, setStatus] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isBelowMinimum = cart.subtotal < minimumOrder;
  const cartSummary =
    cart.itemCount === 0
      ? "Cart empty."
      : `${cart.itemCount.toLocaleString()} ${cart.itemCount === 1 ? "plant" : "plants"} in cart. Estimated total ${formatCurrency(cart.total)}.`;

  React.useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;

    if (target === "empty") {
      emptyHeadingRef.current?.focus();
    } else {
      focusControls.current.get(target)?.focus();
    }
    pendingFocus.current = null;
  }, [cart.lines]);

  function prepareFocusAfterRemoval(
    productId: string,
    control: "decrement" | "remove",
  ) {
    const removedIndex = cart.lines.findIndex((line) => line.id === productId);
    const nextLine =
      cart.lines[removedIndex + 1] ?? cart.lines[removedIndex - 1] ?? null;
    pendingFocus.current = nextLine ? `${control}:${nextLine.id}` : "empty";
  }

  if (!cart.isHydrated) {
    return (
      <div className="text-muted-foreground flex min-h-64 items-center justify-center gap-3 py-20">
        <Spinner aria-hidden="true" />
        <span>Loading cart…</span>
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <>
        <p
          role="status"
          aria-label="Cart summary"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {cartSummary}
        </p>
        <Empty className="mx-auto max-w-2xl py-20">
          <EmptyHeader>
            <h1
              ref={emptyHeadingRef}
              tabIndex={-1}
              className="font-serif text-4xl"
            >
              Your cart is empty
            </h1>
            <EmptyDescription className="text-lg">
              Add daylilies for sale, then send an inquiry to confirm
              availability.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/catalog/for-sale">Browse daylilies for sale</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </>
    );
  }

  return (
    <>
      <p
        role="status"
        aria-label="Cart summary"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {cartSummary}
      </p>
      <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)] lg:py-14">
        <section className="grid content-start gap-6">
          <div className="grid gap-2">
            <h1 className="font-serif text-4xl font-semibold lg:text-6xl">
              Your cart
            </h1>
            <p className="text-muted-foreground">
              This cart sends an availability request. It does not take payment.
            </p>
          </div>

          <div className="grid gap-4">
            {cart.lines.map((line) => (
              <Card key={line.id}>
                <CardContent className="grid gap-4 p-4 lg:grid-cols-[6rem_minmax(0,1fr)_auto] lg:items-center">
                  <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
                    {line.imageUrl ? (
                      <Image
                        src={line.imageUrl}
                        alt=""
                        fill
                        sizes="96px"
                        className="object-cover"
                        unoptimized={!line.imageUrl.startsWith("/")}
                      />
                    ) : null}
                  </div>
                  <div className="grid gap-1">
                    <Link
                      href={`/${line.slug}`}
                      className="font-serif text-xl font-semibold hover:underline"
                    >
                      {line.title}
                    </Link>
                    <p className="text-muted-foreground text-sm">
                      {formatCurrency(line.price)} each
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Remove one ${line.title}`}
                      ref={(node) => {
                        const key = `decrement:${line.id}`;
                        if (node) focusControls.current.set(key, node);
                        else focusControls.current.delete(key);
                      }}
                      onClick={() => {
                        if (line.quantity === 1) {
                          prepareFocusAfterRemoval(line.id, "decrement");
                        }
                        cart.setQuantity(line.id, line.quantity - 1);
                      }}
                    >
                      <Minus aria-hidden="true" />
                    </Button>
                    <span className="min-w-8 text-center">
                      <span className="sr-only">{line.title} quantity: </span>
                      {line.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Add one ${line.title}`}
                      disabled={!canIncrementCartQuantity(line.quantity)}
                      onClick={() =>
                        cart.setQuantity(line.id, line.quantity + 1)
                      }
                    >
                      <Plus aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${line.title} from cart`}
                      ref={(node) => {
                        const key = `remove:${line.id}`;
                        if (node) focusControls.current.set(key, node);
                        else focusControls.current.delete(key);
                      }}
                      onClick={() => {
                        prepareFocusAfterRemoval(line.id, "remove");
                        cart.remove(line.id);
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            className="justify-self-start"
            onClick={() => {
              pendingFocus.current = "empty";
              cart.clear();
            }}
          >
            <Trash2 data-icon="inline-start" aria-hidden="true" />
            Empty cart
          </Button>
        </section>

        <aside className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Order estimate</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex justify-between gap-4">
                <span>Plants</span>
                <span>{formatCurrency(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Estimated shipping</span>
                <span>{formatCurrency(cart.shipping)}</span>
              </div>
              <Separator />
              <div className="flex justify-between gap-4 font-semibold">
                <span>Estimated total</span>
                <span>{formatCurrency(cart.total)}</span>
              </div>
              {isBelowMinimum ? (
                <p className="text-muted-foreground text-sm">
                  The seller asks for a {formatCurrency(minimumOrder)} minimum
                  plant order. You can still request availability now.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Request availability</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setStatus("");
                  setIsSubmitting(true);
                  const form = new FormData(event.currentTarget);
                  try {
                    const response = await fetch("/api/forms", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        kind: "cart",
                        name: form.get("name"),
                        email: form.get("email"),
                        message: form.get("message"),
                        website: form.get("website"),
                        openedAt: openedAt.current,
                        lines: cart.lines.map((line) => ({
                          listingId: line.id,
                          slug: line.slug,
                          title: line.title,
                          quantity: line.quantity,
                          unitPrice: line.price,
                        })),
                        subtotal: cart.subtotal,
                        shipping: cart.shipping,
                        total: cart.total,
                      }),
                    });
                    if (response.status === 409) {
                      const body = (await response
                        .json()
                        .catch(() => null)) as {
                        code?: unknown;
                      } | null;
                      if (body?.code === "form_expired") {
                        openedAt.current = new Date().toISOString();
                        setStatus(
                          "This form expired. Review it, wait a moment, and send it again.",
                        );
                      } else {
                        setStatus(
                          "A listing or price changed. Refresh the page, remove the changed plant, and add it again before you send the request.",
                        );
                      }
                      return;
                    }
                    if (!response.ok) {
                      throw new Error(
                        "The form endpoint rejected the request.",
                      );
                    }
                    cart.clear();
                    router.push("/thanks?from=cart");
                  } catch {
                    setStatus(
                      "The request was not sent. Your cart was kept. Try again later.",
                    );
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="cart-name">Name</FieldLabel>
                    <Input
                      id="cart-name"
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={120}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="cart-email">Email</FieldLabel>
                    <Input
                      id="cart-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="cart-message">
                      Message (optional)
                    </FieldLabel>
                    <Textarea
                      id="cart-message"
                      name="message"
                      rows={4}
                      maxLength={5000}
                    />
                  </Field>
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="cart-website">Website</label>
                    <input
                      id="cart-website"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    <Send data-icon="inline-start" aria-hidden="true" />
                    {isSubmitting ? "Sending…" : "Send availability request"}
                  </Button>
                  <p aria-live="polite" className="text-destructive text-sm">
                    {status}
                  </p>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
