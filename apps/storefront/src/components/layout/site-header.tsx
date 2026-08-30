"use client";

import { Button } from "@daylily-catalog/ui/components/button";
import { Menu, ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { useCart } from "../cart/cart-provider";

const links = [
  { href: "/catalogs", label: "Catalogs" },
  { href: "/catalog/search", label: "Search" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ siteName }: { siteName: string }) {
  const { itemCount } = useCart();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <header className="bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
        <Link
          href="/"
          className="font-serif text-lg font-semibold tracking-tight"
        >
          {siteName}
        </Link>
        <nav
          className="hidden items-center gap-6 lg:flex"
          aria-label="Main navigation"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground text-sm font-medium"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 text-sm font-medium"
          >
            <ShoppingCart className="size-4" aria-hidden="true" />
            Cart{itemCount > 0 ? ` (${itemCount})` : ""}
          </Link>
        </nav>
        <Button
          className="lg:hidden"
          size="icon"
          variant="ghost"
          type="button"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </Button>
      </div>
      {isOpen ? (
        <nav
          id="mobile-navigation"
          className="grid border-t px-4 py-4 lg:hidden"
          aria-label="Mobile navigation"
        >
          {[
            ...links,
            {
              href: "/cart",
              label: `Cart${itemCount > 0 ? ` (${itemCount})` : ""}`,
            },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="min-h-11 py-3 font-medium"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
