"use client";

import { FloatingCartButton } from "@/components/floating-cart-button";

interface FloatingCartButtonWrapperProps {
  userId: string;
  userName?: string;
}

export default function FloatingCartButtonWrapper({
  userId,
  userName,
}: FloatingCartButtonWrapperProps) {
  return <FloatingCartButton userId={userId} userName={userName} />;
}
