import { PublicShell } from "@/components/public-shell";

export default function StartMembershipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicShell>{children}</PublicShell>;
}
