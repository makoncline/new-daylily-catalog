import { type ReactNode } from "react";
import { AuthProviders } from "@/components/auth-providers";

export default function StartSignupLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AuthProviders>{children}</AuthProviders>;
}
