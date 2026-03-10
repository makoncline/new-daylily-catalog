"use client";

import { useEffect, useState } from "react";

/**
 * Hook that returns the current visual viewport height, which accounts for
 * the on-screen keyboard and other UI elements that reduce the visible area.
 *
 * This is more accurate than window.innerHeight for mobile devices with
 * on-screen keyboards.
 */
export function useVisualViewportHeight() {
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 0,
  );

  useEffect(() => {
    const updateHeight = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      } else {
        setViewportHeight(window.innerHeight);
      }
    };

    updateHeight(); // set initial height

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateHeight);
      window.visualViewport.addEventListener("scroll", updateHeight);
    } else {
      window.addEventListener("resize", updateHeight);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateHeight);
        window.visualViewport.removeEventListener("scroll", updateHeight);
      } else {
        window.removeEventListener("resize", updateHeight);
      }
    };
  }, []);

  return viewportHeight;
}
