import { type ReactNode } from "react";
import { AuthProviders } from "@/components/auth-providers";

export default function SignInLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AuthProviders>{children}</AuthProviders>;
}
