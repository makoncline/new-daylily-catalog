"use client";

import { useEffect } from "react";

export function useDashboardSectionFocus(id: string) {
  useEffect(() => {
    if (window.location.hash !== `#${id}`) return;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    });
  }, [id]);
}
