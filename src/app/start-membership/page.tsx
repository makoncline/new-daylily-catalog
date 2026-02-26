import type { Metadata } from "next";
import { StartMembershipPageClient } from "./start-membership-page-client";

export const metadata: Metadata = {
  title: "Start Your Membership",
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

export default function StartMembershipPage() {
  return <StartMembershipPageClient />;
}
