import type { Metadata } from "next";
import { connection } from "next/server";

import { CartPageClient } from "@/components/cart/cart-page-client";
import { getStorefrontSiteConfig } from "@/config/storefront-site-config";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Cart",
    description: "Review daylilies and send an availability request.",
    robots: { index: false, follow: false },
  };
}

export default async function CartPage() {
  await connection();
  const site = getStorefrontSiteConfig();
  return <CartPageClient minimumOrder={site.commerce.minimumOrder} />;
}
