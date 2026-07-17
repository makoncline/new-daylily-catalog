import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";
import {
  FeatureFlagsProvider,
  useFeature,
} from "@/components/feature-flags-provider";

function FeatureProbe() {
  const cultivarSearchEnabled = useFeature("publicCultivarSearch");

  return (
    <output aria-label="Public cultivar search enabled">
      {String(cultivarSearchEnabled)}
    </output>
  );
}

describe("FeatureFlagsProvider", () => {
  let fetchMock: MockInstance<typeof fetch>;

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it("loads the runtime flag once after hydration", async () => {
    fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          features: {
            publicCultivarSearch: true,
          },
        }),
      ),
    );

    render(
      <FeatureFlagsProvider>
        <FeatureProbe />
      </FeatureFlagsProvider>,
    );

    expect(
      screen.getByRole("status", {
        name: "Public cultivar search enabled",
      }),
    ).toHaveTextContent("false");

    await waitFor(() => {
      expect(
        screen.getByRole("status", {
          name: "Public cultivar search enabled",
        }),
      ).toHaveTextContent("true");
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/runtime-config", {
      cache: "no-store",
    });
  });
});
