import { type ReactNode } from "react";
import { AuthProviders } from "@/components/auth-providers";

export default function SignUpLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AuthProviders>{children}</AuthProviders>;
}
