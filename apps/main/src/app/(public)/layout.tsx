import { type Metadata } from "next";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  metadataBase: new URL(getCanonicalBaseUrl()),
};
export const maxDuration = 60;

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicShell>{children}</PublicShell>;
}
