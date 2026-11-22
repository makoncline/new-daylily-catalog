"use client";

import { useEffect, useState } from "react";
import {
  DISABLED_RUNTIME_FEATURE_FLAGS,
  parseRuntimeFeatureFlags,
  type RuntimeFeatureName,
} from "@/config/runtime-feature-flags";
import { getBrowserRuntimeConfig } from "@/lib/browser-runtime-config";

export function useFeature(name: RuntimeFeatureName): boolean {
  const [features, setFeatures] = useState(DISABLED_RUNTIME_FEATURE_FLAGS);

  useEffect(() => {
    void getBrowserRuntimeConfig()
      .then(({ features }) => {
        setFeatures(parseRuntimeFeatureFlags(features));
      })
      .catch(() => {
        // Keep the fail-closed initial snapshot.
      });
  }, []);

  return features[name];
}
