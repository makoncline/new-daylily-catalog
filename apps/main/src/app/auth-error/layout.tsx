import { type ReactNode } from "react";
import { type Metadata } from "next";
import { AuthProviders } from "@/components/auth-providers";
import { PublicShell } from "@/components/public-shell";

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

export default function AuthErrorLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProviders>
      <PublicShell mainClassName="bg-muted/30">{children}</PublicShell>
    </AuthProviders>
  );
}
