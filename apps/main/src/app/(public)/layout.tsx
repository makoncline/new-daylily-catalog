import { type Metadata } from "next";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { PublicShell } from "@/components/public-shell";
import { isPublicCultivarSearchEnabled } from "@/config/feature-flags";

export const metadata: Metadata = {
  metadataBase: new URL(getCanonicalBaseUrl()),
};

export default async function PublicLayout({
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
