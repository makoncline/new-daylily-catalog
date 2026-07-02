import type { Metadata } from "next";
import { StartSignupPageClient } from "./start-signup-page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create Your Catalog | Daylily Catalog",
  description: "Create your Daylily Catalog seller account.",
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

export default function StartSignupPage() {
  return <StartSignupPageClient />;
}
