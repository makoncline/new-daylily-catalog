import { AuthProviders } from "@/components/auth-providers";
import { PublicShell } from "@/components/public-shell";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProviders>
      <PublicShell mainClassName="bg-muted/20">{children}</PublicShell>
    </AuthProviders>
  );
}
