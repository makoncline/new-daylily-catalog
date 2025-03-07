"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

export function TestAuthErrorButton() {
  const [isVisible, setIsVisible] = useState(true);

  const handleTestError = () => {
    // Hide the button to avoid multiple clicks
    setIsVisible(false);

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

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
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
