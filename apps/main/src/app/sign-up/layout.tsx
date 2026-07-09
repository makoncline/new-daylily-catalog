import { type ReactNode } from "react";
import { AuthProviders } from "@/components/auth-providers";
import { PublicShell } from "@/components/public-shell";

export default function SignUpLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthProviders>
      <PublicShell mainClassName="bg-muted/30">{children}</PublicShell>
    </AuthProviders>
  );
}
