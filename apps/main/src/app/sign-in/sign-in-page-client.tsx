"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

const DASHBOARD_PATH = "/dashboard";
const DASHBOARD_IMPORTS_PATH = "/dashboard/imports";

export function SignInPageClient({ returnTo }: { returnTo?: string }) {
  const { isLoaded, userId } = useAuth();
  const redirectPath =
    returnTo === DASHBOARD_IMPORTS_PATH
      ? DASHBOARD_IMPORTS_PATH
      : DASHBOARD_PATH;

  useEffect(() => {
    if (isLoaded && userId) {
      window.location.replace(redirectPath);
    }
  }, [isLoaded, redirectPath, userId]);

  return (
    <div className="flex min-h-[calc(100svh-12rem)] flex-col items-center justify-center px-4 py-12">
      {!isLoaded || userId ? null : (
        <SignIn
          routing="hash"
          forceRedirectUrl={redirectPath}
          fallbackRedirectUrl={redirectPath}
          withSignUp={false}
        />
      )}
    </div>
  );
}
