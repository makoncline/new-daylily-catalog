"use client";

import { useEffect, useState } from "react";
import {
  CULTIVAR_REFERENCE_LINKING_OVERRIDE_CHANGED_EVENT,
  isCultivarReferenceLinkingEnabled,
} from "@/lib/cultivar-reference-linking";

export function useCultivarReferenceLinkingEnabled() {
  const [enabled, setEnabled] = useState(isCultivarReferenceLinkingEnabled());

  useEffect(() => {
    const handleOverrideChanged = () => {
      setEnabled(isCultivarReferenceLinkingEnabled());
    };

    window.addEventListener(
      CULTIVAR_REFERENCE_LINKING_OVERRIDE_CHANGED_EVENT,
      handleOverrideChanged,
    );

    return () => {
      window.removeEventListener(
        CULTIVAR_REFERENCE_LINKING_OVERRIDE_CHANGED_EVENT,
        handleOverrideChanged,
      );
    };
  }, []);

  return enabled;
}

