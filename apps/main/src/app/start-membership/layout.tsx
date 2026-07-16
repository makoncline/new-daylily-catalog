import { PublicShell } from "@/components/public-shell";
import { isPublicCultivarSearchEnabled } from "@/config/feature-flags";

export default function StartMembershipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublicShell cultivarSearchEnabled={isPublicCultivarSearchEnabled()}>
      {children}
    </PublicShell>
  );
}
