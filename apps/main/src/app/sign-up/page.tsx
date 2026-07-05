import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";

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

export default function SignUpPage() {
  redirect(SUBSCRIPTION_CONFIG.NEW_USER_ONBOARDING_PATH);
}
