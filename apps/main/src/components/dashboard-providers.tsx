"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProviders } from "@/components/auth-providers";
import { ClerkUserProfileDialog } from "@/components/clerk-user-profile-dialog";

export function DashboardProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProviders>
      <TooltipProvider>
        {children}
        <ClerkUserProfileDialog />
      </TooltipProvider>
    </AuthProviders>
  );
}
