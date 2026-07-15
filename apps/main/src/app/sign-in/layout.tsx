import { type ReactNode } from "react";
import { AuthProviders } from "@/components/auth-providers";
import { PublicShell } from "@/components/public-shell";
import { isPublicCultivarSearchEnabled } from "@/config/feature-flags";

export default function SignInLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProviders>
      <PublicShell
        cultivarSearchEnabled={isPublicCultivarSearchEnabled()}
        mainClassName="bg-muted/30"
      >
        {children}
      </PublicShell>
    </AuthProviders>
  );
}
