"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

const DASHBOARD_PATH = "/dashboard";

export function SignInPageClient() {
  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    if (isLoaded && userId) {
      window.location.replace(DASHBOARD_PATH);
    }
  }, [isLoaded, userId]);

  return (
    <div className="flex min-h-[calc(100svh-12rem)] flex-col items-center justify-center px-4 py-12">
      {!isLoaded || userId ? null : (
        <SignIn
          routing="hash"
          forceRedirectUrl={DASHBOARD_PATH}
          fallbackRedirectUrl={DASHBOARD_PATH}
          withSignUp={false}
        />
      )}
    </div>
  );
}
