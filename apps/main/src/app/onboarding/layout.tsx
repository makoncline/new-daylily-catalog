import { AuthProviders } from "@/components/auth-providers";
import { PublicShell } from "@/components/public-shell";
import { isPublicCultivarSearchEnabled } from "@/config/feature-flags";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProviders>
      <PublicShell
        cultivarSearchEnabled={isPublicCultivarSearchEnabled()}
        mainClassName="bg-muted/20"
      >
        {children}
      </PublicShell>
    </AuthProviders>
  );
}
