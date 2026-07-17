"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const defaultFeatures = {
  publicCultivarSearch: false,
};
type FeatureName = keyof typeof defaultFeatures;
type Features = Record<FeatureName, boolean>;

const FeatureFlagsContext = createContext<Features>(defaultFeatures);

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<Features>(defaultFeatures);

  useEffect(() => {
    void fetch("/api/runtime-config", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Runtime config request failed: ${response.status}`);
        }

        const runtimeConfig = (await response.json()) as {
          features?: Record<string, unknown>;
        };
        setFeatures({
          publicCultivarSearch:
            runtimeConfig.features?.publicCultivarSearch === true,
        });
      })
      .catch(() => {
        // Keep the fail-closed initial snapshot.
      });
  }, []);

  return (
    <FeatureFlagsContext.Provider value={features}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeature(name: FeatureName): boolean {
  return useContext(FeatureFlagsContext)[name];
}
