import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";
import { useFeature } from "@/hooks/use-feature";

describe("useFeature", () => {
  let fetchMock: MockInstance<typeof fetch>;

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it("loads a runtime flag after hydration", async () => {
    fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          features: {
            publicCultivarSearch: true,
          },
        }),
      ),
    );

    const { result } = renderHook(() => useFeature("publicCultivarSearch"));

    expect(result.current).toBe(false);
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/runtime-config", {
      cache: "no-store",
    });
  });
});
