"use client";

import { useEffect, useState } from "react";

/**
 * Hook that detects when the mobile keyboard is likely open
 * based on significant changes in viewport height
 */
export function useKeyboardStatus() {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    // Skip this logic during SSR
    if (typeof window === "undefined") return;

    // Store baseline height on first render
    const initialHeight = window.innerHeight;

    const handleResize = () => {
      // Use Visual Viewport API if available
      if (window.visualViewport) {
        const currentHeight = window.visualViewport.height;
        // Consider keyboard open if height is significantly reduced (less than 75% of initial)
        const isOpen = currentHeight < initialHeight * 0.75;
        setKeyboardOpen(isOpen);
      } else {
        // Fallback for browsers without Visual Viewport API
        const currentHeight = window.innerHeight;
        // Consider keyboard open if height is significantly reduced (less than 75% of initial)
        const isOpen = currentHeight < initialHeight * 0.75;
        setKeyboardOpen(isOpen);
      }
    };

    // Listen to both resize and Visual Viewport events if available
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      window.visualViewport.addEventListener("scroll", handleResize);
    } else {
      window.addEventListener("resize", handleResize);
    }

    // Check immediately in case keyboard was already open
    handleResize();

    // Clean up event listeners
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
        window.visualViewport.removeEventListener("scroll", handleResize);
      } else {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  return keyboardOpen;
}
