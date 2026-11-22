import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";
import { useFeature } from "@/hooks/use-feature";

describe("useFeature", () => {
  let fetchMock: MockInstance<typeof fetch>;

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it("loads both header flags with one runtime config request", async () => {
    fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          features: {
            publicCultivarSearch: true,
            catalogImporterDiscovery: true,
          },
        }),
      ),
    );

    const { result } = renderHook(() => [
      useFeature("publicCultivarSearch"),
      useFeature("catalogImporterDiscovery"),
    ]);

    expect(result.current).toEqual([false, false]);
    await waitFor(() => {
      expect(result.current).toEqual([true, true]);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/runtime-config", {
      cache: "no-store",
    });
  });
});
