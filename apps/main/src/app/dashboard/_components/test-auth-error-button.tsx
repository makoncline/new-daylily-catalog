"use client";

import { Button } from "@/components/ui/button";

export function TestAuthErrorButton() {
  const handleTestError = () => {
    // Force the browser to clear Clerk session
    document.cookie.split(";").forEach((cookie) => {
      const parts = cookie.trim().split("=");
      const name = parts[0];
      if (name?.startsWith("__clerk")) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });

    // Reload the current page to trigger the middleware
    window.location.reload();
  };

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <Button
        variant="destructive"
        onClick={handleTestError}
        className="text-xs"
      >
        Test Auth Error
      </Button>
    </div>
  );
}
