import type { Metadata } from "next";
import { SignInPageClient } from "./sign-in-page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign In | Daylily Catalog",
  description: "Sign in to open your Daylily Catalog dashboard.",
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

export default function SignInPage() {
  return <SignInPageClient />;
}
