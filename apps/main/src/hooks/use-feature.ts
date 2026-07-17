"use client";

import { useEffect, useState } from "react";
import {
  DISABLED_RUNTIME_FEATURE_FLAGS,
  parseRuntimeFeatureFlags,
  type RuntimeFeatureName,
} from "@/config/runtime-feature-flags";

export function useFeature(name: RuntimeFeatureName): boolean {
  const [features, setFeatures] = useState(DISABLED_RUNTIME_FEATURE_FLAGS);

  useEffect(() => {
    void fetch("/api/runtime-config", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Runtime config request failed: ${response.status}`);
        }

        const runtimeConfig = (await response.json()) as { features?: unknown };
        setFeatures(parseRuntimeFeatureFlags(runtimeConfig.features));
      })
      .catch(() => {
        // Keep the fail-closed initial snapshot.
      });
  }, []);

  return features[name];
}
