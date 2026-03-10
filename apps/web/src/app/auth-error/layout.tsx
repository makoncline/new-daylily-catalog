import { type ReactNode } from "react";
import { type Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AuthErrorLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
